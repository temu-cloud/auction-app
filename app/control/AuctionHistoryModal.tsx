'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, Trophy } from 'lucide-react'

interface Bid {
  id: string
  bidderName: string
  amount: number
  createdAt: string
}

interface AuctionSession {
  id: string
  itemName: string
  itemImageUrl: string | null
  startingPrice: number
  hostedBy: string
  status: string
  startedAt: string
  endedAt: string | null
  bids: Bid[]
}

interface Props {
  onClose: () => void
}

export default function AuctionHistoryModal({ onClose }: Props) {
  const [sessions, setSessions] = useState<AuctionSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AuctionSession | null>(null)

  useEffect(() => {
    fetch('/api/auction/history')
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            {selected && (
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-white mr-1">
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-base font-bold text-amber-400">
              {selected ? selected.itemName : 'Auction History'}
            </h2>
            {selected && (
              <span className="text-xs text-zinc-500">{selected.bids.length} bids</span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading && (
            <p className="text-zinc-500 text-sm text-center py-8">Loading…</p>
          )}

          {/* Session list */}
          {!loading && !selected && (
            sessions.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">No auction history yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="w-full text-left bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-500 rounded-xl p-3 flex gap-3 items-center transition-colors"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-700">
                      {s.itemImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.itemImageUrl} alt={s.itemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">No img</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{s.itemName}</p>
                      {s.hostedBy && <p className="text-xs text-green-400 truncate">{s.hostedBy}</p>}
                      <p className="text-xs text-amber-400">{s.startingPrice.toLocaleString()} ብር starting</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(s.startedAt).toLocaleDateString()} · {s.bids.length} bids ·{' '}
                        <span className={s.status === 'ENDED' ? 'text-zinc-400' : 'text-green-400'}>{s.status}</span>
                      </p>
                    </div>

                    {/* Highest bid */}
                    {s.bids.length > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-zinc-500">Top bid</p>
                        <p className="text-sm font-bold text-amber-400">{s.bids[0].amount.toLocaleString()}</p>
                        <p className="text-xs text-zinc-400 truncate max-w-20">{s.bids[0].bidderName}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          )}

          {/* Bid detail view */}
          {!loading && selected && (
            <div className="space-y-3">
              {/* Item summary */}
              <div className="flex gap-3 items-center bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                {selected.itemImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.itemImageUrl} alt={selected.itemName} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
                <div>
                  <p className="font-bold text-white">{selected.itemName}</p>
                  {selected.hostedBy && <p className="text-xs text-green-400">{selected.hostedBy}</p>}
                  <p className="text-xs text-amber-400">{selected.startingPrice.toLocaleString()} ብር starting</p>
                </div>
              </div>

              {selected.bids.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-6">No bids were placed.</p>
              ) : (
                <div className="space-y-2">
                  {selected.bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${i === 0 ? 'bg-amber-950/40 border-amber-700' : 'bg-zinc-800 border-zinc-700'}`}>
                      <span className="text-xs font-bold text-zinc-500 w-5 text-center">{i + 1}</span>
                      {i === 0 && <Trophy size={16} className="text-yellow-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>{bid.bidderName}</p>
                        <p className="text-xs text-zinc-500">{new Date(bid.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <p className={`font-bold text-sm shrink-0 ${i === 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {bid.amount.toLocaleString()} ብር
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
