"use client";

import { useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";
import { ArrowRight, Crown } from "lucide-react";

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
    <div className=" flex items-center justify-center text-center w-full py-2">
      <span className="text-6xl text-green-400 font-bold">የጫራታው መሪ  </span>
       <span className="text-6xl text-green-400 font bold"><ArrowRight size={50} /></span>
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
              className="inline-block bg-yellow-500/20 rounded-2xl px-3 py-1"
              variants={glowVariants}
              initial="idle"
              animate={leaderChanged ? "pulse" : "idle"}
            >
              <span className="text-6xl font-bold text-green-400   flex gap-2">
                 {highestBid.bidderName}<Crown size={38} className="text-yellow-500" />
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
   
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
