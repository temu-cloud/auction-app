"use client";

import { motion } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";

interface HighestBidDisplayProps {
  highestBid: BidRecord | null;
  startingPrice: number;
}

export default function HighestBidDisplay({ highestBid, startingPrice }: HighestBidDisplayProps) {
  const displayAmount = highestBid ? highestBid.amount : startingPrice;
  const label = highestBid ? "" : "";

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        key={label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-white  tracking-wider"
      >
        {label}
      </motion.div>

      <motion.div
        key={displayAmount}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="font-bold text-amber-400"
style={{ fontSize: "min(20vh, clamp(3rem, 12vw, 10rem))" }}
      >
        {displayAmount}
      ብር
      </motion.div>
    </div>
  );
}
