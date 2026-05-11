"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

export interface CelebrationEffectsProps {
  trigger: "bid" | "winner" | null;
  onComplete?: () => void;
}

interface EdgeParticle {
  id: number;
  emoji: string;
  side: "left" | "right";
  top: number; // percentage
  animKey: number;
}

const BID_EMOJIS = ["🦁", "💥", "🎁", "⚡", "🔥", "✨", "🎉"];
const WINNER_EMOJIS = ["🏆", "🦁", "💥", "🎊", "⭐", "🎁", "🔥", "✨"];

let particleCounter = 0;

export default function CelebrationEffects({ trigger, onComplete }: CelebrationEffectsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [particles, setParticles] = useState<EdgeParticle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    if (trigger === "bid") {
      confetti({ particleCount: 15, spread: 35, angle: 60, origin: { x: 0, y: 0.6 }, scalar: 0.7, ticks: 70 });
      confetti({ particleCount: 15, spread: 35, angle: 120, origin: { x: 1, y: 0.6 }, scalar: 0.7, ticks: 70 });

      const count = 2;
      const newParticles: EdgeParticle[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: particleCounter++,
          emoji: BID_EMOJIS[Math.floor(Math.random() * BID_EMOJIS.length)],
          side: i % 2 === 0 ? "left" : "right",
          top: 25 + Math.random() * 50,
          animKey: Date.now() + i,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    } else {
      confetti({ particleCount: 18, spread: 40, angle: 60, origin: { x: 0, y: 0.5 }, scalar: 0.7, ticks: 80 });
      confetti({ particleCount: 18, spread: 40, angle: 120, origin: { x: 1, y: 0.5 }, scalar: 0.7, ticks: 80 });

      const newParticles: EdgeParticle[] = [];
      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: particleCounter++,
          emoji: WINNER_EMOJIS[Math.floor(Math.random() * WINNER_EMOJIS.length)],
          side: i % 2 === 0 ? "left" : "right",
          top: 15 + Math.random() * 70,
          animKey: Date.now() + i,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    }

    const duration = trigger === "bid" ? 1800 : 4500;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            [p.side]: "4px",
            top: `${p.top}%`,
            fontSize: "2.5rem",
            animation: "edgeFloat 1.6s ease-out forwards",
            transform: p.side === "left" ? "translateX(0)" : "translateX(0)",
          }}
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes edgeFloat {
          0%   { opacity: 0; transform: translateY(0) scale(0.5); }
          20%  { opacity: 1; transform: translateY(-10px) scale(1.2); }
          80%  { opacity: 1; transform: translateY(-40px) scale(1); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
        }
      `}</style>
    </div>
  );
}
