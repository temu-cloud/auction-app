'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { signOut } from '@/lib/auth-client'
import type { AuctionState, BidRecord } from '@/lib/auction-state'
import ItemSetupForm from './ItemSetupForm'
import BidForm from './BidForm'
import TimerControls from './TimerControls'
import DisplayPreview from './DisplayPreview'
import UserRoleManager from './UserRoleManager'

interface ControlClientProps {
  user: { id: string; name: string; email: string; role: string }
}

const DEFAULT_STATE: AuctionState = {
  phase: 'idle', sessionId: null,
  item: { name: '', imageUrl: null, startingPrice: 0, hostedBy: '' },
  bids: [], highestBid: null, sidebarVisible: false,
  timer: { status: 'stopped', durationSeconds: 0, remainingSeconds: 0, startedAt: null },
  winner: null,
}

export default function ControlClient({ user }: ControlClientProps) {
  const [mounted, setMounted] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [auctionState, setAuctionState] = useState<AuctionState>(DEFAULT_STATE)
  const [startingAuction, setStartingAuction] = useState(false)

  useEffect(() => {
    setMounted(true)
    const s = io({ path: '/socket.io', transports: ['websocket', 'polling'] })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('auction:state', (state: AuctionState) => setAuctionState(state))
    s.on('auction:bid', ({ bid }: { bid: BidRecord }) => {
      setAuctionState((prev) => ({ ...prev, bids: [...prev.bids, bid], highestBid: bid }))
    })
    s.on('auction:ended', ({ winner }: { winner: BidRecord | null }) => {
      setAuctionState((prev) => ({ ...prev, phase: 'ended', sessionId: null, winner, timer: { ...prev.timer, status: 'stopped' } }))
    })
    s.on('auction:reset', (state: AuctionState) => setAuctionState(state))
    s.on('timer:tick', ({ remainingSeconds }: { remainingSeconds: number }) => {
      setAuctionState((prev) => ({ ...prev, timer: { ...prev.timer, remainingSeconds } }))
    })
    s.on('timer:state', ({ status, remainingSeconds }: { status: AuctionState['timer']['status']; remainingSeconds: number }) => {
      setAuctionState((prev) => ({ ...prev, timer: { ...prev.timer, status, remainingSeconds } }))
    })
    s.on('sidebar:state', ({ visible }: { visible: boolean }) => {
      setAuctionState((prev) => ({ ...prev, sidebarVisible: visible }))
    })
    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  const handleStartAuction = useCallback(async () => {
    const { item } = auctionState
    if (!item.name.trim()) { toast.error('Set an item name first'); return }
    setStartingAuction(true)
    try {
      const res = await fetch('/api/auction/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemName: item.name, 
          itemImageUrl: item.imageUrl ?? undefined, 
          startingPrice: item.startingPrice,
          hostedBy: item.hostedBy ?? undefined,
        }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? 'Failed') }
      toast.success('Auction started!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start auction')
    } finally { setStartingAuction(false) }
  }, [auctionState])

  function handleEndAuction() { if (socket) socket.emit('auction:end') }
  function handleSidebarToggle() { if (socket) socket.emit('sidebar:toggle', { visible: !auctionState.sidebarVisible }) }
  async function handleStopCelebration() {
    try {
      const res = await fetch('/api/auction/reset', { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')
      toast.success('Display reset')
    } catch {
      toast.error('Failed to reset display')
    }
  }
  async function handleSignOut() { await signOut(); window.location.href = '/login' }

  const isActive = auctionState.phase === 'active'
  const isEnded = auctionState.phase === 'ended'
  const isSuperOperator = user.role === 'SUPER_OPERATOR'

  if (!mounted) {
    return (
      <div className="h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Connecting…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Toaster position="top-right" toastOptions={{ style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #3f3f46' } }} />

      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-2">
        <div className="hidden lg:block w-40" />
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <h1 className="text-sm font-bold text-amber-400">Auction Control</h1>
          <span className={`flex items-center gap-1 text-xs font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-900 text-green-300' : isEnded ? 'bg-amber-900 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
            {isActive ? 'LIVE' : isEnded ? 'ENDED' : 'IDLE'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/display" className="text-xs text-zinc-400 hover:text-zinc-200 whitespace-nowrap">→ Display</Link>
          <p className="text-xs text-zinc-400 hidden sm:block truncate max-w-24">{user.name}</p>
          <button onClick={handleSignOut} className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 whitespace-nowrap">Sign Out</button>
        </div>
      </header>

      {/* Body: stacks on mobile, 3 columns on large screens */}
      <div className="flex flex-col lg:flex-row lg:flex-1 lg:overflow-hidden">

        {/* COL 1: Item setup + auction buttons */}
        <div className="lg:w-80 lg:shrink-0 flex flex-col gap-2 p-3 border-b lg:border-b-0 lg:border-r border-zinc-800 lg:overflow-y-auto">
          <ItemSetupForm currentItem={auctionState.item} onItemUpdated={() => {}} phase={auctionState.phase} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Auction</h2>
            {isEnded ? (
              <button onClick={handleStartAuction} disabled={startingAuction || !socket} className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors">
                {startingAuction ? 'Starting…' : '🔄 Start New Auction'}
              </button>
            ) : (
              <button onClick={handleStartAuction} disabled={startingAuction || isActive || !socket} className="w-full rounded-lg bg-green-700 hover:bg-green-600 disabled:bg-zinc-700 text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors">
                {startingAuction ? 'Starting…' : isActive ? 'Running…' : 'Start Auction'}
              </button>
            )}
            {!isEnded && (
              <button onClick={handleEndAuction} disabled={!socket || !isActive} className="w-full rounded-lg bg-red-800 hover:bg-red-700 disabled:bg-zinc-700 text-white disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors">
                End Auction
              </button>
            )}
            <button onClick={handleSidebarToggle} disabled={!socket} className="w-full rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-zinc-100 disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors">
              {auctionState.sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
            <button
              onClick={handleStopCelebration}
              disabled={!socket}
              className="w-full rounded-lg bg-rose-900 hover:bg-rose-800 disabled:bg-zinc-800 text-rose-100 disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors cursor-pointer"
            >
              ⏹ Stop &amp; Reset Display
            </button>
          </div>
        </div>

        {/* COL 2: Preview + Bid Form */}
        <div className="flex flex-col gap-2 p-3 border-b lg:border-b-0 lg:border-r border-zinc-800 lg:overflow-y-auto lg:flex-1">
          <DisplayPreview state={auctionState} />
          {isEnded && auctionState.winner && (
            <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">የጫራታው አሸናፊ</p>
              <p className="text-base font-bold text-white">{auctionState.winner.bidderName}</p>
              <p className="text-lg font-bold text-amber-400">
                {auctionState.winner.amount.toLocaleString()} ብር
              </p>
            </div>
          )}
          <BidForm socket={socket} highestBid={auctionState.highestBid?.amount ?? null} startingPrice={auctionState.item.startingPrice} auctionActive={isActive} />
        </div>

        {/* COL 3: Timer + User management */}
        <div className="flex flex-col gap-2 p-3 lg:w-110 lg:overflow-y-auto">
          <TimerControls socket={socket} timerStatus={auctionState.timer.status} remainingSeconds={auctionState.timer.remainingSeconds} />
          {isSuperOperator && <UserRoleManager />}
        </div>

      </div>
    </div>
  )
}
