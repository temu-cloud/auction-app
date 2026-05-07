"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export interface CelebrationEffectsProps {
  trigger: "bid" | "winner" | null;
  onComplete?: () => void;
}

export default function CelebrationEffects({ trigger, onComplete }: CelebrationEffectsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!trigger) return;

    if (trigger === "bid") {
      // Small burst — just enough to feel exciting without obscuring the UI
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 }, scalar: 0.7, ticks: 80 });
    } else {
      // Winner — moderate, fires from sides so center content stays visible
      confetti({ particleCount: 50, spread: 60, origin: { x: 0.1, y: 0.4 }, scalar: 0.8, ticks: 150 });
      confetti({ particleCount: 50, spread: 60, origin: { x: 0.9, y: 0.4 }, scalar: 0.8, ticks: 150 });
    }

    const duration = trigger === "bid" ? 1500 : 4000;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onComplete?.(), duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger, onComplete]);

  return null;
}
