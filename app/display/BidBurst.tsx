"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { BidRecord } from "@/lib/auction-state";

interface BidBurstProps {
  bid: BidRecord | null;
  onComplete: () => void;
}

export default function BidBurst({ bid, onComplete }: BidBurstProps) {
  // Fire confetti burst on mount and schedule onComplete after 1000ms.
  // Key-based cancellation is handled by the parent passing key={bid?.id} —
  // when the key changes React unmounts/remounts this component, which
  // cancels the previous animation and clears these effects automatically.
  useEffect(() => {
    if (!bid) return;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
    });

    const timer = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [bid, onComplete]);

  if (!bid) return null;

  const formattedAmount = bid.amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/30">
        {/* Phase 1 (0–300ms): scale 1.5→1.0, opacity 0→1
            Phase 2 (300–900ms): scale 1.0→0.1, y 0→-200, opacity 1→0 */}
        <motion.div
          initial={{ scale: 1.5, opacity: 0, y: 0 }}
          animate={{
            scale: [1.5, 1.0, 0.1],
            opacity: [0, 1, 0],
            y: [0, 0, -200],
          }}
          transition={{
            duration: 0.9,
            times: [0, 0.333, 1],
            ease: "easeInOut",
          }}
          className="flex flex-col items-center gap-2 text-white"
        >
          <span
            className="font-semibold tracking-wide"
            style={{ fontSize: "clamp(1.5rem, 6vw, 4rem)" }}
          >
            {bid.bidderName}
          </span>
          <span
            className="font-bold"
            style={{
              fontSize: "clamp(3rem, 10vw, 8rem)",
              filter: "drop-shadow(0 0 24px #fbbf24)",
            }}
          >
            {formattedAmount}
          </span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
