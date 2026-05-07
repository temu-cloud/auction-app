"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { BidRecord } from "@/lib/auction-state";
import { SoundEffects } from "@/app/display/hooks/useSoundEffects";

interface WinnerScreenProps {
  winner: BidRecord | null;
  sounds: SoundEffects;
  onReset?: () => void;
}

export default function WinnerScreen({ winner, sounds, onReset }: WinnerScreenProps) {
  const nameRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gsapCtxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    if (winner === null) return;

    // 1. Play fanfare
    sounds.playFanfare();

    // 2. Three sequential confetti bursts — modest size so they don't obscure the winner
    const burst = () =>
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.3 },
        scalar: 0.8,
        ticks: 120,
      });

    burst(); // t=0

    const t1 = setTimeout(() => burst(), 1200);
    const t2 = setTimeout(() => burst(), 2400);
    timeoutsRef.current.push(t1, t2);

    // 3. GSAP timeline on the winner name element
    if (nameRef.current) {
      gsapCtxRef.current = gsap.context(() => {
        gsap
          .timeline()
          .from(nameRef.current!, { scale: 0, duration: 0.5, ease: "back.out(1.7)" })
          .to(nameRef.current!, { scale: 1.2, duration: 0.15, ease: "power2.out" })
          .to(nameRef.current!, { scale: 1.0, duration: 0.15, ease: "power2.in" });
      });
    }

    return () => {
      // Clean up timeouts
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      // Clean up GSAP
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = null;
    };
  }, [winner, sounds]);

  // ── No-winner branch ──────────────────────────────────────────────────────
  if (winner === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-7xl font-bold text-zinc-400 text-center"
        >
          No Winner
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 text-2xl text-zinc-500"
        >
          The auction ended with no bids.
        </motion.p>
        {onReset && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            onClick={onReset}
            className="mt-10 px-8 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xl font-semibold transition-colors"
          >
            Start New Auction
          </motion.button>
        )}
      </motion.div>
    );
  }

  // ── Winner branch ─────────────────────────────────────────────────────────
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(winner.amount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-amber-950 via-zinc-950 to-black overflow-hidden"
    >
      {/* Trophy header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-7xl font-bold text-amber-400 mb-12 flex items-center space-x-6"
      >
        <span>🏆</span>
        <span>WINNER!</span>
        <span>🏆</span>
      </motion.div>

      {/* Winner name — GSAP animates this element */}
      <div
        ref={nameRef}
        className="font-bold text-white mb-8 text-center px-8"
        style={{
          fontSize: "clamp(4rem, 12vw, 10rem)",
          filter: "drop-shadow(0 0 30px #fbbf24)",
          willChange: "transform",
        }}
      >
        {winner.bidderName}
      </div>

      {/* Winning amount */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="space-y-2 text-center"
      >
        <p className="text-3xl text-zinc-400 uppercase tracking-wider">Winning Bid</p>
        <p className="text-8xl font-bold text-amber-400">{formattedAmount}</p>
      </motion.div>

      {/* Decorative sparkles */}
      {(["top-20 left-20", "top-20 right-20", "bottom-20 left-1/4", "bottom-20 right-1/4"] as const).map(
        (pos, i) => (
          <motion.div
            key={pos}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 1.2 + i * 0.2, duration: 2, repeat: Infinity }}
            className={`absolute ${pos} text-6xl`}
          >
            {i < 2 ? "✨" : "🎊"}
          </motion.div>
        )
      )}

      {/* Reset button */}
      {onReset && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          onClick={onReset}
          className="absolute bottom-10 px-8 py-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xl font-semibold transition-colors"
        >
          Start New Auction
        </motion.button>
      )}
    </motion.div>
  );
}
