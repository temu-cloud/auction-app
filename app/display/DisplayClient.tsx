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
  item: { name: "", imageUrl: null, startingPrice: 0, hostedBy: "" },
  bids: [],
  highestBid: null,
  sidebarVisible: false,
  timer: { status: "stopped", durationSeconds: 0, remainingSeconds: 0, startedAt: null },
  winner: null,
};

export default function DisplayClient() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AuctionState>(defaultState);
  const [celebrationTrigger, setCelebrationTrigger] = useState<"bid" | "winner" | null>(null);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [currentBurstBid, setCurrentBurstBid] = useState<BidRecord | null>(null);
  const [showBidFlash, setShowBidFlash] = useState(false);
  const bidFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLeaderNameRef = useRef<string | null>(null);
  const sounds = useSoundEffects();

  useEffect(() => {
    setMounted(true);
    const socket: Socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });

    socket.on("connect", () => { socket.emit("request:state"); });

    socket.on("auction:state", (incoming: AuctionState) => {
      setState(incoming);
      if (incoming.phase === "active" || incoming.phase === "idle") {
        setCurrentBurstBid(null);
        setCelebrationTrigger(null);
        setShowBidFlash(false);
        prevLeaderNameRef.current = null;
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
      setCelebrationKey((k) => k + 1);
      sounds.playBidCheer();

      // Flash winner2.mp4 for 1.5 s on new bid
      setShowBidFlash(true);
      if (bidFlashTimerRef.current) clearTimeout(bidFlashTimerRef.current);
      bidFlashTimerRef.current = setTimeout(() => setShowBidFlash(false), 1500);
    });

    socket.on("auction:ended", ({ winner }: { winner: BidRecord | null }) => {
      setState((prev: AuctionState) => ({
        ...prev, phase: "ended", winner, timer: { ...prev.timer, status: "stopped" },
      }));
      setCelebrationTrigger("winner");
      setCelebrationKey((k) => k + 1);
    });

    socket.on("auction:reset", (newState: AuctionState) => {
      setState(newState);
      setCurrentBurstBid(null);
      setCelebrationTrigger(null);
      setShowBidFlash(false);
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

    return () => {
      socket.disconnect();
      if (bidFlashTimerRef.current) clearTimeout(bidFlashTimerRef.current);
    };
  }, [sounds]);

  const timerActive = state.timer.status !== "stopped";
  const auctionEnded = state.phase === "ended";

  // Screen 1: default start screen — no item set
  const showDefaultIdle = state.phase === "idle" && !state.item.name;

  // Screen 2: item preview — idle/active-no-bids with item set
  const showItemPreview =
    (state.phase === "idle" && !!state.item.name) ||
    (state.phase === "active" && state.bids.length === 0 && !!state.item.name);

  if (!mounted) {
    return (
      <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 text-white items-center justify-center">
        <span className="text-zinc-600 text-sm">Connecting…</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 text-white">

      {/* ── SCREEN 1: Default idle — background video + placeholder text ── */}
      {showDefaultIdle && (
        <div className="absolute inset-0 z-10">
          {/* Background video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326479/background1_ilc0v0.mp4" type="video/mp4" />
          </video>
          {/* Overlay so text is readable */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Placeholder auction text */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-amber-400 tracking-wide">
              እንኳን ወደ ከፍተኛ የጨረታ መድረክ በደህና መጡ!
            </h1>
            <h2 className="text-5xl lg:text-8xl font-bold text-white">
              ጨረታዎን ያሸንፉ ንግድዎን ከፍ ያድርጉ
            </h2>
            <h1 className="text-5xl lg:text-4xl text-green-400 font-bold">
              መልካም እድል!!!!!!
            </h1>
          </div>
        </div>
      )}

      {/* ── SCREEN 2: Item preview — image left, data right with video ── */}
      {showItemPreview && (
        <div className="absolute inset-0 z-10 flex bg-zinc-950">
          {/* Left half — image (NO video here) */}
          <div className="w-1/2 h-full flex items-center justify-center overflow-hidden bg-black">
            {state.item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.item.imageUrl}
                alt={state.item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500 text-xl">No Image</span>
              </div>
            )}
          </div>

          {/* Right half — text with video background ONLY */}
          <div className="w-1/2 h-full relative overflow-hidden">
            {/* Background video for right section only */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326479/background1_ilc0v0.mp4" type="video/mp4" />
            </video>
            
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/50" />
            
            {/* Text content */}
            <div className="relative z-10 w-full h-full flex flex-col py-5 gap-6 px-8 lg:px-16">
              {state.item.hostedBy && (
                <h1 className="text-4xl lg:text-5xl text-green-400 font-bold">
                  {state.item.hostedBy}
                </h1>
              )}
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                {state.item.name}
              </h1>
              <div className=" gap-1">
                <h3 className="text-4xl lg:text-6xl text-amber-400 mb-1">የጫራታው መነሻ ዋጋ :</h3>
                <p className="text-4xl lg:text-5xl font-bold text-amber-400">
                  {state.item.startingPrice.toLocaleString()} ብር
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Brief bid-flash video (winner2.mp4) — 1.5 s on new bid ── */}
      {showBidFlash && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <video
            key={Date.now()}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover opacity-50"
          >
            <source src="https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326628/winner2_mnrylf.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* ── Main bidding layout (always rendered, background video behind it) ── */}
      {!auctionEnded && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none z-0"
        >
          <source src="https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326479/background1_ilc0v0.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── Main bidding layout ── */}
      <div
        className={`relative z-0 flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
          state.sidebarVisible ? "mr-80" : ""
        }`}
      >
        <div className="shrink-0 pt-2">
          <LeaderBanner highestBid={state.highestBid} prevLeaderId={prevLeaderNameRef.current} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <HighestBidDisplay highestBid={state.highestBid} startingPrice={state.item.startingPrice} />
        </div>
        <div className="h-3/5 overflow-hidden border-t border-zinc-800">
          <BidFeed bids={state.bids} />
        </div>
      </div>

      {/* ── Item sidebar ── */}
      {state.sidebarVisible && (
        <div className="absolute right-0 top-0 h-full w-80 border-l border-zinc-800 bg-zinc-900 z-10">
          <ItemSidebar item={state.item} visible={state.sidebarVisible} />
        </div>
      )}

      {/* ── Timer overlay ── */}
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

      {/* ── Winner screen ── */}
      {auctionEnded && (
        <div className="absolute inset-0 z-20">
          <WinnerScreen winner={state.winner} sounds={sounds} />
        </div>
      )}

      {/* ── BidBurst overlay ── */}
      {currentBurstBid && (
        <BidBurst key={currentBurstBid.id} bid={currentBurstBid} onComplete={() => setCurrentBurstBid(null)} />
      )}

      <CelebrationEffects key={celebrationKey} trigger={celebrationTrigger} onComplete={() => setCelebrationTrigger(null)} />
    </div>
  );
}