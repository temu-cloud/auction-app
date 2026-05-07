'use client'

import type { AuctionState } from '@/lib/auction-state'

interface DisplayPreviewProps {
  state: AuctionState
}

const SCALE = 0.22
const VIRTUAL_W = 1280
const VIRTUAL_H = 720

function getBidRowStyle(index: number): React.CSSProperties {
  if (index === 0) {
    return {
      background: 'rgba(34,197,94,0.1)',
      border: '1px solid #22c55e',
      color: '#86efac',
    }
  }
  if (index === 1) {
    return {
      background: 'rgba(234,179,8,0.1)',
      border: '1px solid #eab308',
      color: '#fde047',
    }
  }
  return {
    background: 'rgba(39,39,42,0.5)',
    border: '1px solid #3f3f46',
    color: '#a1a1aa',
  }
}

export default function DisplayPreview({ state }: DisplayPreviewProps) {
  const { phase, item, bids, highestBid, sidebarVisible, timer, winner } = state

  // Newest-first, capped at 8 for preview
  const displayBids = [...bids].reverse().slice(0, 8)
  const displayAmount = highestBid
    ? highestBid.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : item.startingPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const bidLabel = highestBid ? 'Current Bid' : 'Starting Price'

  const showTimer = timer.status !== 'stopped'
  const showWinner = phase === 'ended'
  const showIdle = phase === 'idle'

  const minutes = Math.floor(Math.max(0, timer.remainingSeconds) / 60)
  const seconds = Math.floor(Math.max(0, timer.remainingSeconds) % 60)
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Live Preview
      </p>

      {/* Outer container */}
      <div
        className="relative border border-zinc-700 rounded-lg overflow-hidden bg-zinc-950"
        style={{ width: VIRTUAL_W * SCALE, height: VIRTUAL_H * SCALE }}
      >
        {/* Inner virtual canvas */}
        <div
          style={{
            width: VIRTUAL_W,
            height: VIRTUAL_H,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            backgroundColor: '#09090b',
            fontFamily: 'sans-serif',
          }}
        >
          {showWinner ? (
            /* ── Winner screen ── */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: 'linear-gradient(135deg, #451a03, #09090b, #000)',
                gap: 24,
              }}
            >
              <div style={{ fontSize: 72, fontWeight: 700, color: '#fbbf24' }}>🏆 WINNER! 🏆</div>
              {winner ? (
                <>
                  <div style={{ fontSize: 110, fontWeight: 800, color: '#fff', filter: 'drop-shadow(0 0 20px #fbbf24)' }}>
                    {winner.bidderName}
                  </div>
                  <div style={{ fontSize: 28, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 3 }}>
                    Winning Bid
                  </div>
                  <div style={{ fontSize: 80, fontWeight: 700, color: '#fbbf24' }}>
                    {winner.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 80, fontWeight: 700, color: '#71717a' }}>No Winner</div>
              )}
            </div>
          ) : showIdle ? (
            /* ── Idle / item preview state ── */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: 'linear-gradient(135deg, #18181b, #09090b)',
                gap: 24,
                padding: 40,
              }}
            >
              {item.name ? (
                <>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ maxWidth: 320, maxHeight: 240, objectFit: 'contain', borderRadius: 12 }}
                    />
                  )}
                  <div style={{ fontSize: 52, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{item.name}</div>
                  <div style={{ fontSize: 36, color: '#fbbf24', fontWeight: 600 }}>
                    Starting: {item.startingPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 24, color: '#52525b', marginTop: 8 }}>Ready to start auction</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 60, color: '#3f3f46' }}>🏷️</div>
                  <div style={{ fontSize: 32, color: '#52525b', fontWeight: 600 }}>Set an item to begin</div>
                </>
              )}
            </div>
          ) : showTimer ? (
            /* ── Timer overlay ── */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: timer.remainingSeconds < 10
                  ? 'linear-gradient(135deg, #450a0a, #09090b, #000)'
                  : 'linear-gradient(135deg, #451a03, #09090b, #000)',
                gap: 16,
              }}
            >
              <div style={{ fontSize: 32, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 4 }}>
                {timer.status === 'paused' ? 'Paused' : 'Time Remaining'}
              </div>
              <div
                style={{
                  fontSize: 200,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: timer.remainingSeconds < 10 ? '#ef4444' : '#f59e0b',
                  lineHeight: 1,
                }}
              >
                {formattedTime}
              </div>
            </div>
          ) : (
            /* ── Main bidding layout ── */
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Leader name — top center */}
                <div
                  style={{
                    padding: '16px 32px 10px',
                    textAlign: 'center',
                    borderBottom: '1px solid #27272a',
                    flexShrink: 0,
                  }}
                >
                  {highestBid ? (
                    <span style={{ fontSize: 44, fontWeight: 700, color: '#fbbf24' }}>
                      👑 {highestBid.bidderName}
                    </span>
                  ) : item.name ? (
                    <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                      {item.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 24, color: '#52525b', fontStyle: 'italic' }}>
                      Waiting for first bid...
                    </span>
                  )}
                </div>

                {/* Current bid price — center, max 25% height */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxHeight: '25%',
                    gap: 4,
                  }}
                >
                  <div style={{ color: '#71717a', fontSize: 22, textTransform: 'uppercase', letterSpacing: 3 }}>
                    {bidLabel}
                  </div>
                  <div style={{ color: '#fbbf24', fontSize: 120, fontWeight: 800, lineHeight: 1 }}>
                    {displayAmount}
                  </div>
                </div>

                {/* BidFeed — bottom, remaining space */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'hidden',
                    padding: '12px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    borderTop: '1px solid #27272a',
                  }}
                >
                  {displayBids.length === 0 ? (
                    <div style={{ color: '#52525b', fontSize: 24, margin: 'auto' }}>
                      Waiting for bids...
                    </div>
                  ) : (
                    displayBids.map((bid, index) => (
                      <div
                        key={bid.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderRadius: 8,
                          padding: '6px 16px',
                          ...getBidRowStyle(index),
                        }}
                      >
                        <span style={{ fontSize: 20, fontWeight: 600 }}>{bid.bidderName}</span>
                        <span style={{ fontSize: 22, fontWeight: 700 }}>
                          {bid.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sidebar */}
              {sidebarVisible && (
                <div
                  style={{
                    width: 280,
                    borderLeft: '1px solid #27272a',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    background: '#18181b',
                  }}
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                    />
                  )}
                  <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{item.name}</div>
                  <div>
                    <div style={{ color: '#71717a', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>
                      Starting Price
                    </div>
                    <div style={{ color: '#fbbf24', fontSize: 32, fontWeight: 700 }}>
                      {item.startingPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
