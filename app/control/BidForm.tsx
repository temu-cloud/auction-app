'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { Socket } from 'socket.io-client'

interface BidFormProps {
  socket: Socket | null
  highestBid: number | null
  startingPrice: number
  auctionActive: boolean
}

export default function BidForm({ socket, highestBid, startingPrice, auctionActive }: BidFormProps) {
  const [bidderName, setBidderName] = useState('')
  const [increment, setIncrement] = useState<number | ''>('')

  const currentBase = highestBid !== null ? highestBid : startingPrice
  const previewAmount = increment !== '' && increment > 0 ? currentBase + increment : null

  // Listen for bid:rejected events and show error toast
  useEffect(() => {
    if (!socket) return

    function onBidRejected({ reason }: { reason: string }) {
      toast.error(reason ?? 'Bid was rejected')
    }

    socket.on('bid:rejected', onBidRejected)
    return () => {
      socket.off('bid:rejected', onBidRejected)
    }
  }, [socket])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!bidderName.trim()) {
      toast.error('Bidder name is required')
      return
    }
    if (increment === '' || increment <= 0) {
      toast.error('Increment must be greater than zero')
      return
    }
    if (!socket) {
      toast.error('Not connected to server')
      return
    }
    if (!auctionActive) {
      toast.error('Start the auction before adding bids')
      return
    }

    const totalAmount = currentBase + Number(increment)

    socket.emit('bid:add', {
      bidderName: bidderName.trim(),
      amount: totalAmount,
    })

    // Optimistically clear the form
    setBidderName('')
    setIncrement('')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Add Bid
        </h2>
        <span className="text-xs text-zinc-500">
          Base:{' '}
          <span className="text-amber-400 font-semibold">
            {currentBase.toLocaleString()} ብር
          </span>
        </span>
      </div>

      {!auctionActive && (
        <p className="text-xs text-amber-500 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
          Start the auction to enable bidding
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Bidder Name */}
        <div className="space-y-1">
          <label htmlFor="bidder-name" className="block text-xs font-medium text-zinc-400">
            Bidder Name
          </label>
          <input
            id="bidder-name"
            type="text"
            value={bidderName}
            onChange={(e) => setBidderName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
        </div>

        {/* Increment Amount */}
        <div className="space-y-1">
          <label htmlFor="bid-increment" className="block text-xs font-medium text-zinc-400">
            Add Amount (increment)
          </label>
          <input
            id="bid-increment"
            type="number"
            min={1}
            step="any"
            value={increment}
            onChange={(e) =>
              setIncrement(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="e.g. 500"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
          {previewAmount !== null && (
            <p className="text-xs text-green-400 font-semibold">
              Total bid: {previewAmount.toLocaleString()} ብር
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!socket || !auctionActive}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-950 disabled:text-zinc-500 font-semibold py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          Submit Bid
        </button>
      </form>
    </div>
  )
}
