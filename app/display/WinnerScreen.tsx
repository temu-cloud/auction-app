"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { BidRecord } from "@/lib/auction-state";
import { SoundEffects } from "@/app/display/hooks/useSoundEffects";
import { Star, Trophy } from "lucide-react";

interface WinnerScreenProps {
  winner: BidRecord | null;
  sounds: SoundEffects;
  onReset?: () => void;
}

const WINNER_VIDEOS = [
  "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778325674/winner1_mauqh7.mp4",
  "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326628/winner2_mnrylf.mp4",
  "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326871/winner3_edgakv.mp4",
  "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778326436/winner4_feozxm.mp4",
  "https://res.cloudinary.com/dpdzihcnp/video/upload/v1778327298/winner5_kefwor.mp4",
];

export default function WinnerScreen({ winner, sounds, onReset }: WinnerScreenProps) {
  const nameRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gsapCtxRef = useRef<gsap.Context | null>(null);
  const [videoSrc] = useState(() =>
    WINNER_VIDEOS[Math.floor(Math.random() * WINNER_VIDEOS.length)]
  );

  useEffect(() => {
    if (winner === null) return;

    sounds.playFanfare();

    const burst = () => {
      confetti({ particleCount: 12, spread: 35, angle: 60, origin: { x: 0, y: 0.6 }, scalar: 0.6, ticks: 60 });
      confetti({ particleCount: 12, spread: 35, angle: 120, origin: { x: 1, y: 0.6 }, scalar: 0.6, ticks: 60 });
    };

    burst();
    const t1 = setTimeout(() => burst(), 3000);
    const t2 = setTimeout(() => burst(), 6000);
    timeoutsRef.current.push(t1, t2);

    if (nameRef.current) {
      gsapCtxRef.current = gsap.context(() => {
        gsap
          .timeline()
          .from(nameRef.current!, { scale: 0, duration: 1.2, ease: "back.out(1.2)" })
          .to(nameRef.current!, { scale: 1.05, duration: 0.4, ease: "power1.out" })
          .to(nameRef.current!, { scale: 1.0, duration: 0.4, ease: "power1.in" });
      });
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = null;
    };
  }, [winner, sounds]);

  if (winner === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex flex-col items-center justify-center h-full w-full bg-zinc-950 overflow-hidden"
      >
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-7xl font-bold text-zinc-400 text-center"
          >
            No Winner
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-2xl text-zinc-500"
          >
            The auction ended with no bids.
          </motion.p>
          {onReset && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              onClick={onReset}
              className="mt-10 px-8 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xl font-semibold transition-colors"
            >
              Start New Auction
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  const formattedAmount = new Intl.NumberFormat().format(winner.amount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden"
    >
      {/* Background video — random winner video */}
      <video
        key={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      {/* Dark overlay so text stays readable */}
      <div className="absolute inset-0 bg-black/55" />

      {/* All content sits above the video */}
      <div className="relative z-10 flex flex-col items-center w-full px-8">
        {/* Trophy header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-7xl font-bold text-amber-400 mb-10 flex items-center space-x-6"
        >
          <Trophy size={80} className="text-yellow-500" />
          <span>የጫራታው አሸናፊ!</span>
          <span>🏆</span>
        </motion.div>

       
        {/* Winner name with spring bounce */}
        <motion.div
          className="font-bold text-white mb-8 text-center w-full break-words px-4"
          style={{
            fontSize: "clamp(2rem, 8vw, 8rem)",
            lineHeight: 1.1,
            filter: "drop-shadow(0 0 30px #fbbf24)",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
          initial={{ scale: 0.5, opacity: 0, y: -100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            damping: 12,
            stiffness: 200,
            mass: 1,
          }}
        >
          {winner.bidderName}
        </motion.div>

        {/* Winning amount */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="space-y-2 text-center"
        >
          <p className="text-3xl text-zinc-300 uppercase tracking-wider">በከፍተኛ ፉክክር እና</p>
          <p className="text-5xl lg:text-8xl font-bold text-amber-400">በ {formattedAmount} ብር</p>
          <p className="text-3xl text-white tracking-wider">እንኳን ደስ አለዎ!!!</p>
        </motion.div>

        {/* Decorative sparkles */}
        {(["top-20 left-20", "top-20 right-20", "bottom-20 left-1/4", "bottom-20 right-1/4"] as const).map(
          (pos, i) => (
            <motion.div
              key={pos}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 1.2 + i * 0.2, duration: 2, repeat: Infinity }}
              className={`absolute ${pos} text-6xl`}
            >
              {i < 2
                ? <Star size={60} className="text-yellow-400 animate-ping" />
                : <Star size={40} className="text-yellow-500 animate-ping" />}
            </motion.div>
          )
        )}

        {/* Reset button */}
        {onReset && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            onClick={onReset}
            className="mt-10 px-8 py-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xl font-semibold transition-colors"
          >
            Start New Auction
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
