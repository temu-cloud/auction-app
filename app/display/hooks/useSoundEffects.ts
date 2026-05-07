"use client";

import { useRef, useCallback, useEffect } from "react";
import { Howl, Howler } from "howler";

export interface SoundEffects {
  playBidCheer(): void;
  playTickNormal(): void;
  playTickUrgent(): void;
  playEndBell(): void;
  playFanfare(): void;
  setMuted(muted: boolean): void;
}

interface SoundEntry {
  howl: Howl | null;
  failed: boolean;
}

function createSound(src: string): SoundEntry {
  const entry: SoundEntry = { howl: null, failed: false };

  if (typeof window === "undefined") {
    return entry;
  }

  try {
    entry.howl = new Howl({
      src: src ? [src] : ['data:audio/mp3;base64,'],
      format: ['mp3'],
      preload: false,
      onloaderror: () => {
        entry.failed = true;
      },
    });
  } catch {
    entry.failed = true;
  }

  return entry;
}

export function useSoundEffects(): SoundEffects {
  // Use placeholder URLs — real audio files can be swapped in later.
  // Empty string causes Howler to fail gracefully via onloaderror.
  const bidCheerRef = useRef<SoundEntry | null>(null);
  const tickNormalRef = useRef<SoundEntry | null>(null);
  const tickUrgentRef = useRef<SoundEntry | null>(null);
  const endBellRef = useRef<SoundEntry | null>(null);
  const fanfareRef = useRef<SoundEntry | null>(null);

  // Initialise Howl instances once (browser-only)
  if (typeof window !== "undefined") {
    if (!bidCheerRef.current) bidCheerRef.current = createSound("");
    if (!tickNormalRef.current) tickNormalRef.current = createSound("");
    if (!tickUrgentRef.current) tickUrgentRef.current = createSound("");
    if (!endBellRef.current) endBellRef.current = createSound("");
    if (!fanfareRef.current) fanfareRef.current = createSound("");
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      [bidCheerRef, tickNormalRef, tickUrgentRef, endBellRef, fanfareRef].forEach((ref) => {
        if (ref.current?.howl) {
          try {
            ref.current.howl.unload();
          } catch {
            // ignore cleanup errors
          }
        }
      });
    };
  }, []);

  const playSound = useCallback((entry: SoundEntry | null) => {
    if (!entry || entry.failed || !entry.howl) return;
    try {
      entry.howl.stop();
      entry.howl.play();
    } catch {
      // ignore playback errors
    }
  }, []);

  const playBidCheer = useCallback(() => {
    playSound(bidCheerRef.current);
  }, [playSound]);

  const playTickNormal = useCallback(() => {
    playSound(tickNormalRef.current);
  }, [playSound]);

  const playTickUrgent = useCallback(() => {
    playSound(tickUrgentRef.current);
  }, [playSound]);

  const playEndBell = useCallback(() => {
    playSound(endBellRef.current);
  }, [playSound]);

  const playFanfare = useCallback(() => {
    playSound(fanfareRef.current);
  }, [playSound]);

  const setMuted = useCallback((muted: boolean) => {
    if (typeof window === "undefined") return;
    try {
      Howler.mute(muted);
    } catch {
      // ignore
    }
  }, []);

  return {
    playBidCheer,
    playTickNormal,
    playTickUrgent,
    playEndBell,
    playFanfare,
    setMuted,
  };
}
