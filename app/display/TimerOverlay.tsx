"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { TimerStatus } from "@/lib/auction-state";
import { SoundEffects } from "@/app/display/hooks/useSoundEffects";

interface TimerOverlayProps {
  status: TimerStatus;
  remainingSeconds: number;
  sounds: SoundEffects;
  onTimerEnd: () => void;
  leaderName?: string | null;
}

export default function TimerOverlay({
  status,
  remainingSeconds,
  sounds,
  onTimerEnd,
  leaderName,
}: TimerOverlayProps) {
  const timerRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const endFiredRef = useRef(false);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const isPaused = status === "paused";

  // ── GSAP pulse / color / vignette ────────────────────────────────────────
  useEffect(() => {
    const timerEl = timerRef.current;
    const vignetteEl = vignetteRef.current;
    if (!timerEl || !vignetteEl) return;

    gsap.killTweensOf(timerEl);
    gsap.killTweensOf(vignetteEl);

    const secs = Math.floor(remainingSeconds);

    if (secs === 0) {
      gsap.set(timerEl, { opacity: 1, color: "#ef4444" });
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });

      if (!endFiredRef.current) {
        endFiredRef.current = true;
        sounds.playEndBell();
        onTimerEnd();
      }
      return;
    }

    endFiredRef.current = false;

    if (isPaused) {
      // Static amber, no pulse while paused
      gsap.set(timerEl, { opacity: 0.8, color: "#f59e0b" });
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });
      return;
    }

    if (secs <= 3) {
      const vignetteSize = secs === 3 ? 50 : secs === 2 ? 100 : 150;
      gsap.to(vignetteEl, {
        boxShadow: `inset 0 0 ${vignetteSize}px red`,
        duration: 0.4,
        ease: "power2.out",
      });
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, { opacity: 0.6, duration: 0.5, repeat: -1, yoyo: true, ease: "power1.inOut" });
      sounds.playTickUrgent();
    } else if (secs <= 5) {
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, { opacity: 0.6, duration: 0.5, repeat: -1, yoyo: true, ease: "power1.inOut" });
      sounds.playTickUrgent();
    } else if (secs <= 10) {
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, { opacity: 0.6, duration: 0.5, repeat: -1, yoyo: true, ease: "power1.inOut" });
    } else {
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });
      gsap.set(timerEl, { color: "#f59e0b" });
      gsap.to(timerEl, { opacity: 0.6, duration: 1, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }
  }, [remainingSeconds, status, sounds, onTimerEnd, isPaused]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) gsap.killTweensOf(timerRef.current);
      if (vignetteRef.current) gsap.killTweensOf(vignetteRef.current);
    };
  }, []);

  // When paused, render a compact banner at the top so the main layout shows through
  if (isPaused) {
    return (
      <div className="pointer-events-none flex flex-col mt-60 items-center pt-4 w-full">
        <div className="bg-black/70 rounded-2xl px-8 py-3 flex flex-col items-center gap-1 border border-amber-500/40">
 
          <div className="text-sm font-semibold text-amber-400 uppercase tracking-widest">
            ⏸ Paused
          </div>
          <div
            ref={timerRef}
            className="font-bold text-amber-400"
            style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
          >
            {formattedTime}
          </div>
        </div>
        <div ref={vignetteRef} className="fixed inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0px red" }} />
      </div>
    );
  }

  // Running — full overlay
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-zinc-950 via-zinc-950 to-black relative">
      <div
        ref={vignetteRef}
        className="fixed inset-0 pointer-events-none z-20"
        style={{ boxShadow: "inset 0 0 0px red" }}
      />

      {leaderName && (
        <div className="text-2xl font-bold text-zinc-300 mb-4 tracking-wide">
           {leaderName}
        </div>
      )}

      <div className="text-3xl font-semibold text-zinc-400 uppercase tracking-wider mb-8">
        ጨረታው ሊዘጋ የቀረው ሰዓት
      </div>

      <div
        ref={timerRef}
        className="font-bold"
        style={{ fontSize: "clamp(6rem, 20vw, 16rem)", color: "#f59e0b", opacity: 1 }}
      >
        {formattedTime}
      </div>

      {Math.floor(remainingSeconds) <= 10 && remainingSeconds > 0 && (
        <div className="text-4xl font-bold text-red-400 mt-8 uppercase tracking-widest">
          የመጨረሻ እድል ይሞክሩ !
        </div>
      )}
    </div>
  );
}
