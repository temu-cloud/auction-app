"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BidRecord } from "@/lib/auction-state";

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
  return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
}

export default function BidFeed({ bids }: BidFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Take the last 50 bids and reverse so newest is at index 0
  const displayBids = useMemo(() => bids.slice(-50).reverse(), [bids]);

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
        <div className="flex items-center justify-center h-full text-zinc-500 text-2xl">
          Waiting for bids...
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
              className={`flex items-center justify-between rounded-lg px-6 py-3 border ${getRowClasses(index)}`}
            >
              <span className="text-2xl font-semibold">{bid.bidderName}</span>
              <span className="text-3xl font-bold">
                {bid.amount.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
