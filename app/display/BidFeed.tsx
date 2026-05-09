"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";
import confetti from "canvas-confetti";

interface BidFeedProps {
  bids: BidRecord[];
}

function getRowClasses(index: number): string {
  if (index === 0) {
    return "border-green-500 bg-green-500/10 text-green-300";
  }
  if (index === 1) {
    return "border-yellow-500 bg-yellow-500/10 text-yellow-300";
  }
  if (index === 2) {
    return "border-yellow-400 bg-yellow-400/10 text-yellow-200";
  }
  if (index === 3) {
    return "border-red-500 bg-red-500/10 text-red-300";
  }
  return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
}

// Audio setup
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

// Cheer sound function
function playCheerSound() {
  if (!audioUnlocked) return;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const now = audioContext.currentTime;
    
    // Multiple oscillators for crowd cheer effect
    const freqs = [440, 554, 659, 880];
    freqs.forEach((freq, i) => {
      const osc = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      osc.connect(gain);
      gain.connect(audioContext!.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.03 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.8);
    });
    
    // Woo sound
    const woo = audioContext!.createOscillator();
    const wooGain = audioContext!.createGain();
    woo.connect(wooGain);
    wooGain.connect(audioContext!.destination);
    woo.frequency.value = 300;
    wooGain.gain.setValueAtTime(0, now);
    wooGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    wooGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    woo.start(now);
    woo.stop(now + 0.45);
  } catch(e) {
    // Silent fail
  }
}

// Quick particle explosion (appears and disappears fast)
function triggerQuickExplosion() {
  // Single quick burst
  confetti({
    particleCount: 80,
    spread: 65,
    origin: { y: 0.5 },
    startVelocity: 20,
    colors: ["#facc15", "#ffb347", "#ffffff", "#fef08a"],
    decay: 0.8,
    ticks: 100,
    gravity: 0.9,
  });
  
  // Small side bursts
  confetti({
    particleCount: 30,
    angle: 60,
    spread: 45,
    origin: { x: 0, y: 0.5 },
    startVelocity: 15,
    colors: ["#facc15", "#ffb347"],
    decay: 0.7,
    ticks: 80,
  });
  
  confetti({
    particleCount: 30,
    angle: 120,
    spread: 45,
    origin: { x: 1, y: 0.5 },
    startVelocity: 15,
    colors: ["#facc15", "#ffb347"],
    decay: 0.7,
    ticks: 80,
  });
}

export default function BidFeed({ bids }: BidFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevBidsCountRef = useRef<number>(bids.length);

  // Take the last 50 bids and reverse so newest is at index 0
  const displayBids = useMemo(() => bids.slice(-50).reverse(), [bids]);

  // Auto-unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioUnlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Trigger celebration on EVERY new bid
  useEffect(() => {
    // Check if a new bid was added
    if (bids.length > prevBidsCountRef.current && bids.length > 0) {
      // Trigger explosion
      triggerQuickExplosion();
      // Trigger cheer sound
      playCheerSound();
    }
    
    // Update the ref for next comparison
    prevBidsCountRef.current = bids.length;
  }, [bids]);

  // Auto-scroll to top (newest) on each bids update
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [bids]);

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto overflow-x-hidden px-8 py-4 space-y-2"
    >
      {displayBids.length === 0 ? (
        <div className="flex items-center justify-center h-full text-white text-semibold text-2xl">
          ይጫረቱ ያሸንፉ!!
        </div>
      ) : (
        <AnimatePresence>
          {displayBids.map((bid, index) => (
            <motion.div
              key={bid.id}
              layout
              data-testid="bid-row"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex items-center justify-between rounded-lg px-3 border ${getRowClasses(index)}`}
            >
              <span className="text-6xl font-bold">{bid.bidderName}</span>
              <span className="text-6xl font-bold">
                {bid.amount.toLocaleString()} ብር
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}