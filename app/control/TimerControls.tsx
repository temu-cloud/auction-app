'use client'

import { useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { TimerStatus } from '@/lib/auction-state'

interface TimerControlsProps {
  socket: Socket | null
  timerStatus: TimerStatus
  remainingSeconds: number
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function TimerControls({
  socket,
  timerStatus,
  remainingSeconds,
}: TimerControlsProps) {
  const [duration, setDuration] = useState<number | ''>(60)

  function handleStart() {
    if (!socket) return
    if (isPaused) {
      // Resume from where it was paused
      socket.emit('timer:start', { durationSeconds: remainingSeconds })
    } else {
      if (duration === '' || duration <= 0) return
      socket.emit('timer:start', { durationSeconds: Number(duration) })
    }
  }

  function handlePause() {
    if (!socket) return
    socket.emit('timer:pause')
  }

  function handleReset() {
    if (!socket) return
    socket.emit('timer:reset')
  }

  const isRunning = timerStatus === 'running'
  const isPaused = timerStatus === 'paused'
  const isStopped = timerStatus === 'stopped'

  const statusColor =
    isRunning
      ? 'text-green-400'
      : isPaused
      ? 'text-amber-400'
      : 'text-zinc-500'

  const statusLabel = isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Timer
        </h2>
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      {/* Current time display */}
      <div className="text-center">
        <span className="text-4xl font-bold font-mono text-amber-400">
          {formatTime(remainingSeconds)}
        </span>
      </div>

      {/* Duration input */}
      <div className="space-y-1">
        <label htmlFor="timer-duration" className="block text-xs font-medium text-zinc-400">
          Duration (seconds)
        </label>
        <input
          id="timer-duration"
          type="number"
          min={1}
          value={duration}
          onChange={(e) =>
            setDuration(e.target.value === '' ? '' : Number(e.target.value))
          }
          disabled={isRunning}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Start */}
        <button
          onClick={handleStart}
          disabled={!socket || isRunning}
          className="rounded-lg bg-green-700 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          {isPaused ? 'Resume' : 'Start'}
        </button>

        {/* Pause */}
        <button
          onClick={handlePause}
          disabled={!socket || !isRunning}
          className="rounded-lg bg-amber-700 hover:bg-amber-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          Pause
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          disabled={!socket || (isStopped && remainingSeconds === 0)}
          className="rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
