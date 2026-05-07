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
}

export default function TimerOverlay({
  status,
  remainingSeconds,
  sounds,
  onTimerEnd,
}: TimerOverlayProps) {
  const timerRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  // Track whether onTimerEnd has already been called for this zero-crossing
  const endFiredRef = useRef(false);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // ── GSAP pulse / color / vignette based on remainingSeconds ──────────────
  useEffect(() => {
    const timerEl = timerRef.current;
    const vignetteEl = vignetteRef.current;
    if (!timerEl || !vignetteEl) return;

    // Kill any running tweens on these elements before setting up new ones
    gsap.killTweensOf(timerEl);
    gsap.killTweensOf(vignetteEl);

    const secs = Math.floor(remainingSeconds);

    if (secs === 0) {
      // Stop all animation, reset opacity
      gsap.set(timerEl, { opacity: 1, color: "#ef4444" });
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });

      if (!endFiredRef.current) {
        endFiredRef.current = true;
        sounds.playEndBell();
        onTimerEnd();
      }
      return;
    }

    // Reset the end-fired guard whenever we're above 0
    endFiredRef.current = false;

    if (secs <= 3) {
      // Vignette intensity: 3s→50px, 2s→100px, 1s→150px
      const vignetteSize = secs === 3 ? 50 : secs === 2 ? 100 : 150;
      gsap.to(vignetteEl, {
        boxShadow: `inset 0 0 ${vignetteSize}px red`,
        duration: 0.4,
        ease: "power2.out",
      });

      // Red color + 1s pulse
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, {
        opacity: 0.6,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });

      // Play urgent tick sound each second
      sounds.playTickUrgent();
    } else if (secs <= 5) {
      // Clear vignette
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });

      // Red color + 1s pulse
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, {
        opacity: 0.6,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });

      // Play urgent tick sound each second
      sounds.playTickUrgent();
    } else if (secs <= 10) {
      // Clear vignette
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });

      // Transition to red, 1s pulse
      gsap.set(timerEl, { color: "#ef4444" });
      gsap.to(timerEl, {
        opacity: 0.6,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    } else {
      // > 10s: amber color, slow 2s pulse
      gsap.set(vignetteEl, { boxShadow: "inset 0 0 0px red" });
      gsap.set(timerEl, { color: "#f59e0b" });
      gsap.to(timerEl, {
        opacity: 0.6,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    }
  }, [remainingSeconds, sounds, onTimerEnd]);

  // ── Page Visibility API — pause/resume GSAP global timeline ──────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        gsap.globalTimeline.pause();
      } else {
        gsap.globalTimeline.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ── Cleanup all tweens on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) gsap.killTweensOf(timerRef.current);
      if (vignetteRef.current) gsap.killTweensOf(vignetteRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-zinc-950 via-zinc-950 to-black relative">
      {/* Screen-edge vignette overlay */}
      <div
        ref={vignetteRef}
        className="fixed inset-0 pointer-events-none z-20"
        style={{ boxShadow: "inset 0 0 0px red" }}
      />

      <div className="text-3xl font-semibold text-zinc-400 uppercase tracking-wider mb-8">
        {status === "paused" ? "Paused" : "Time Remaining"}
      </div>

      <div
        ref={timerRef}
        className="font-bold"
        style={{
          fontSize: "clamp(6rem, 20vw, 16rem)",
          color: "#f59e0b",
          opacity: 1,
        }}
      >
        {formattedTime}
      </div>

      {Math.floor(remainingSeconds) <= 10 && remainingSeconds > 0 && (
        <div className="text-4xl font-bold text-red-400 mt-8 uppercase tracking-widest">
          Final Seconds!
        </div>
      )}
    </div>
  );
}
