"use client";

import { motion } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";

interface HighestBidDisplayProps {
  highestBid: BidRecord | null;
  startingPrice: number;
}

export default function HighestBidDisplay({ highestBid, startingPrice }: HighestBidDisplayProps) {
  const displayAmount = highestBid ? highestBid.amount : startingPrice;
  const label = highestBid ? "Current Bid" : "Starting Price";

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        key={label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-semibold text-zinc-400 uppercase tracking-wider"
      >
        {label}
      </motion.div>

      <motion.div
        key={displayAmount}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="font-bold text-amber-400"
        style={{ fontSize: "min(25vh, clamp(4rem, 15vw, 12rem))" }}
      >
        {displayAmount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </motion.div>
    </div>
  );
}
