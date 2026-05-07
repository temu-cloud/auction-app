"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { AuctionState, BidRecord, TimerStatus } from "@/lib/auction-state";
import BidFeed from "./BidFeed";
import HighestBidDisplay from "./HighestBidDisplay";
import LeaderBanner from "./LeaderBanner";
import ItemSidebar from "./ItemSidebar";
import TimerOverlay from "./TimerOverlay";
import WinnerScreen from "./WinnerScreen";
import CelebrationEffects from "./CelebrationEffects";
import BidBurst from "./BidBurst";
import { useSoundEffects } from "./hooks/useSoundEffects";

const defaultState: AuctionState = {
  phase: "idle",
  sessionId: null,
  item: { name: "", imageUrl: null, startingPrice: 0 },
  bids: [],
  highestBid: null,
  sidebarVisible: false,
  timer: { status: "stopped", durationSeconds: 0, remainingSeconds: 0, startedAt: null },
  winner: null,
};

export default function DisplayClient() {
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<AuctionState>(defaultState);
  const [celebrationTrigger, setCelebrationTrigger] = useState<"bid" | "winner" | null>(null);
  const [currentBurstBid, setCurrentBurstBid] = useState<BidRecord | null>(null);
  const prevLeaderNameRef = useRef<string | null>(null);
  const sounds = useSoundEffects();

  useEffect(() => {
    setMounted(true)
    const socket: Socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });

    // Pull current state on connect — fallback for when the push broadcast
    // from POST /api/auction/session was missed (e.g. socket server not ready)
    socket.on("connect", () => {
      socket.emit("request:state");
    });

    socket.on("auction:state", (incoming: AuctionState) => {
      setState(incoming);
      // Clear all celebration/burst state when a new auction starts or resets
      if (incoming.phase === "active" || incoming.phase === "idle") {
        setCurrentBurstBid(null);
        setCelebrationTrigger(null);
        prevLeaderNameRef.current = null;
        // Kill any in-flight confetti immediately
        import("canvas-confetti").then((m) => m.default.reset());
      }
    });

    socket.on("auction:bid", (bid: BidRecord) => {
      setState((prev: AuctionState) => {
        prevLeaderNameRef.current = prev.highestBid?.bidderName ?? null;
        return { ...prev, bids: [...prev.bids, bid], highestBid: bid };
      });
      setCurrentBurstBid(bid);
      setCelebrationTrigger("bid");
      sounds.playBidCheer();
    });

    socket.on("auction:ended", ({ winner }: { winner: BidRecord | null }) => {
      setState((prev: AuctionState) => ({
        ...prev, phase: "ended", winner, timer: { ...prev.timer, status: "stopped" },
      }));
      setCelebrationTrigger("winner");
    });

    socket.on("auction:reset", (newState: AuctionState) => {
      setState(newState);
      setCurrentBurstBid(null);
      setCelebrationTrigger(null);
      prevLeaderNameRef.current = null;
      import("canvas-confetti").then((m) => m.default.reset());
    });

    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setState((prev: AuctionState) => ({ ...prev, timer: { ...prev.timer, remainingSeconds } }));
    });

    socket.on("timer:state", ({ status, remainingSeconds }: { status: TimerStatus; remainingSeconds: number }) => {
      setState((prev: AuctionState) => ({ ...prev, timer: { ...prev.timer, status, remainingSeconds } }));
    });

    socket.on("sidebar:state", ({ visible }: { visible: boolean }) => {
      setState((prev: AuctionState) => ({ ...prev, sidebarVisible: visible }));
    });

    return () => { socket.disconnect(); };
  }, [sounds]);

  const timerActive = state.timer.status !== "stopped";
  const auctionEnded = state.phase === "ended";
  const showIdleItem = state.phase === "idle" && !!state.item.name;

  if (!mounted) {
    return (
      <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 text-white items-center justify-center">
        <span className="text-zinc-600 text-sm">Connecting…</span>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 text-white">

      {/* Idle phase item preview — shown when operator has set an item but auction hasn't started */}
      {showIdleItem && (
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center gap-8 p-12">
          {state.item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.item.imageUrl}
              alt={state.item.name}
              className="max-h-64 max-w-lg object-contain rounded-2xl shadow-2xl"
            />
          )}
          <h1 className="text-7xl font-bold text-white text-center drop-shadow-lg">{state.item.name}</h1>
          <p className="text-4xl text-amber-400 font-semibold">
            Starting:{" "}
            {state.item.startingPrice.toLocaleString("en-US", {
              style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
            })}
          </p>
        </div>
      )}

      {/* Main bidding layout */}
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${state.sidebarVisible ? "mr-80" : ""}`}>
        {/* Leader — top center */}
        <div className="flex-shrink-0 pt-2">
          <LeaderBanner highestBid={state.highestBid} prevLeaderId={prevLeaderNameRef.current} />
        </div>
        {/* Bid price — center */}
        <div className="flex flex-1 items-center justify-center">
          <HighestBidDisplay highestBid={state.highestBid} startingPrice={state.item.startingPrice} />
        </div>
        {/* BidFeed — bottom 40% */}
        <div className="h-2/5 overflow-hidden border-t border-zinc-800">
          <BidFeed bids={state.bids} />
        </div>
      </div>

      {/* Item sidebar */}
      {state.sidebarVisible && (
        <div className="absolute right-0 top-0 h-full w-80 border-l border-zinc-800 bg-zinc-900">
          <ItemSidebar item={state.item} visible={state.sidebarVisible} />
        </div>
      )}

      {/* Timer overlay */}
      {timerActive && (
        <div className="absolute inset-0 z-10">
          <TimerOverlay
            status={state.timer.status}
            remainingSeconds={state.timer.remainingSeconds}
            sounds={sounds}
            onTimerEnd={() => setState((prev: AuctionState) => ({ ...prev, phase: "ended" }))}
          />
        </div>
      )}

      {/* Winner screen */}
      {auctionEnded && (
        <div className="absolute inset-0 z-20">
          <WinnerScreen winner={state.winner} sounds={sounds} />
        </div>
      )}

      {/* BidBurst overlay */}
      {currentBurstBid && (
        <BidBurst key={currentBurstBid.id} bid={currentBurstBid} onComplete={() => setCurrentBurstBid(null)} />
      )}

      <CelebrationEffects trigger={celebrationTrigger} onComplete={() => setCelebrationTrigger(null)} />
    </div>
  );
}
