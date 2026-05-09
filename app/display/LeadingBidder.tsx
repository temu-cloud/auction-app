"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";

interface LeadingBidderProps {
  highestBid: BidRecord | null;
}

export default function LeadingBidder({ highestBid }: LeadingBidderProps) {
  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {highestBid ? (
          <motion.div
            key={highestBid.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="flex items-center space-x-4"
          >
            <span className="text-4xl">🏆</span>
            <span className="text-3xl font-semibold text-white">
              የጫራታው መሪ: <span className="text-amber-400">{highestBid.bidderName}</span>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-2xl text-white font-semibold text-center"
          >
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
