"use client";

import { useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";

interface LeaderBannerProps {
  highestBid: BidRecord | null;
  prevLeaderId: string | null;
}

export default function LeaderBanner({
  highestBid,
  prevLeaderId,
}: LeaderBannerProps) {
  // Detect leader change: compare current bidderName with prevLeaderId
  const leaderChanged =
    highestBid !== null && highestBid.bidderName !== prevLeaderId;

  // Track whether we should show the glow ring (fires once per leader change)
  const glowKey = useRef(0);
  if (leaderChanged) {
    glowKey.current += 1;
  }

  const glowVariants: Variants = {
    idle: {
      boxShadow: "0 0 0px transparent",
    },
    pulse: {
      boxShadow: [
        "0 0 0px transparent",
        "0 0 30px #fbbf24",
        "0 0 15px #fbbf24",
        "0 0 30px #fbbf24",
        "0 0 0px transparent",
      ],
      transition: {
        duration: 1.5,
        ease: "easeInOut" as const,
        times: [0, 0.25, 0.5, 0.75, 1],
      },
    },
  };

  const nameVariants: Variants = {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut" as const },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.25, ease: "easeIn" as const },
    },
  };

  return (
    <div className="text-center w-full py-4">
      <AnimatePresence mode="wait">
        {highestBid ? (
          <motion.div
            key={highestBid.bidderName}
            variants={nameVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Glow ring wrapper — re-keyed on each leader change to re-trigger animation */}
            <motion.div
              key={`glow-${glowKey.current}`}
              className="inline-block rounded-2xl px-8 py-3"
              variants={glowVariants}
              initial="idle"
              animate={leaderChanged ? "pulse" : "idle"}
            >
              <span className="text-5xl font-bold text-amber-400">
                👑 {highestBid.bidderName}
              </span>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            variants={nameVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <span className="text-2xl text-zinc-500 italic">
              Waiting for first bid...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
