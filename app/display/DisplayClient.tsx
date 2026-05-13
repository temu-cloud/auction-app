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

// Screen 1 dedicated background
const SCREEN1_BG = "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778685964/screen1_jh95rx.mp4";

// Screen 2 text-half background
const SCREEN2_TEXT_BG = "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326479/background1_ilc0v0.mp4";

// Main bidding layout background
const BIDDING_BG = "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778495276/lionroar_i9cq3l.mp4";


export default function DisplayClient() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AuctionState>(defaultState);
  const [celebrationTrigger, setCelebrationTrigger] = useState<"bid" | "winner" | null>(null);
  const [celebrationKey, setCelebrationKey] = useState(() => Date.now());
  const [currentBurstBid, setCurrentBurstBid] = useState<BidRecord | null>(null);
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
      setCelebrationKey(Date.now());
      sounds.playBidCheer();
    });

    socket.on("auction:ended", ({ winner }: { winner: BidRecord | null }) => {
      setState((prev: AuctionState) => ({
        ...prev, phase: "ended", winner, timer: { ...prev.timer, status: "stopped" },
      }));
      setCelebrationTrigger("winner");
      setCelebrationKey(Date.now());
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

    return () => {
      socket.disconnect();
    };
  }, [sounds]);

  const timerVisible = state.timer.status !== "stopped";
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

      {/* ── SCREEN 1: Default idle — dedicated background + text ── */}
      {showDefaultIdle && (
        <div className="absolute inset-0 z-10">
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover brightness-125 contrast-110 saturate-150 pointer-events-none"
          >
            <source src={SCREEN1_BG} type="video/mp4" />
          </video>
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 px-4 text-center"
               style={{ textShadow: "0 2px 16px rgba(0,0,0,0.95)" }}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-amber-400 tracking-wide">
              እንኳን ወደ ከፍተኛ የጨረታ መድረክ በደህና መጡ!
            </h1>
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-white">
              ጨረታዎን ያሸንፉ ንግድዎን ከፍ ያድርጉ
            </h2>
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-green-400 font-bold">
              መልካም እድል!!!!!!
            </h1>
          </div>
        </div>
      )}

      {/* ── Persistent main bidding background ── */}
      {!auctionEnded && !showDefaultIdle && (
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-125 contrast-110 saturate-150 pointer-events-none z-[1]"
        >
          <source src={BIDDING_BG} type="video/mp4" />
        </video>
      )}

      {/* ── SCREEN 2: Item preview — image left, data right ── */}
      {showItemPreview && (
        <div className="absolute inset-0 z-10 flex flex-col sm:flex-row">
          {/* Image — full width on mobile, half on sm+ */}
          <div className="w-full sm:w-1/2 h-1/2 sm:h-full flex items-center justify-center overflow-hidden bg-black">
            {state.item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.item.imageUrl} alt={state.item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500 text-xl">No Image</span>
              </div>
            )}
          </div>

          {/* Text half */}
          <div className="w-full sm:w-1/2 h-1/2 sm:h-full relative overflow-hidden">
            <video
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover brightness-125 contrast-110 saturate-150 pointer-events-none"
            >
              <source src={SCREEN2_TEXT_BG} type="video/mp4" />
            </video>
            <div className="relative z-10 w-full h-full flex flex-col py-2 gap-2 sm:gap-3 px-2 sm:px-3 overflow-y-auto"
                 style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
              {state.item.hostedBy && (
                <h1 className="text-2xl sm:text-3xl lg:text-5xl p-2 text-green-400 font-bold border-2 border-green-400 rounded-xl">
                  {state.item.hostedBy}
                </h1>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-6xl p-2 font-bold text-white border-2 border-white leading-tight rounded-xl">
                {state.item.name}
              </h1>
              <div className="p-2 border-2 border-amber-400 rounded-xl">
                <h3 className="text-xl sm:text-2xl lg:text-5xl text-amber-400 mb-1">የጫራታው መነሻ ዋጋ :</h3>
                <p className="text-2xl sm:text-3xl lg:text-5xl font-bold text-amber-400">
                  {state.item.startingPrice.toLocaleString()} ብር
                </p>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-5xl text-white border-2 border-white rounded-xl p-2">
                ጫራታው ሊጀመር ነው!!!
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* ── Main bidding layout ── */}
      {!auctionEnded && !showDefaultIdle && !showItemPreview && (
        <div
          className={`relative z-10 flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
            state.sidebarVisible ? "sm:mr-72 lg:mr-80" : ""
          }`}
        >
          <div className="shrink-0 pt-1 sm:pt-2">
            <LeaderBanner highestBid={state.highestBid} prevLeaderId={prevLeaderNameRef.current} />
          </div>
          <div className="flex flex-1 items-center justify-center px-2">
            <HighestBidDisplay highestBid={state.highestBid} startingPrice={state.item.startingPrice} />
          </div>
          <div className="h-2/5 sm:h-3/5 overflow-hidden border-t border-zinc-800">
            <BidFeed bids={state.bids} />
          </div>
        </div>
      )}

      {/* ── Item sidebar ── */}
      {state.sidebarVisible && (
        <div className="absolute right-0 top-0 h-full w-64 sm:w-72 lg:w-80 border-l border-zinc-800 bg-zinc-900/90 z-10">
          <ItemSidebar item={state.item} visible={state.sidebarVisible} />
        </div>
      )}

      {/* ── Timer overlay ── */}
      {timerVisible && (
        <div className={state.timer.status === "paused"
          ? "absolute top-0 left-0 right-0 z-20 flex justify-center"
          : "absolute inset-0 z-20"}>
          <TimerOverlay
            status={state.timer.status}
            remainingSeconds={state.timer.remainingSeconds}
            sounds={sounds}
            leaderName={state.highestBid?.bidderName ?? null}
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
