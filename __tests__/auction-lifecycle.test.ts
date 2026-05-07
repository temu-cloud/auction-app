/**
 * Integration test: Full auction lifecycle
 * Start session → add bids → end session → verify winner
 * Requirements: 2.3, 2.6, 6.1
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AuctionStateManager } from '@/lib/auction-state'

describe('Full auction lifecycle', () => {
  let manager: AuctionStateManager

  beforeEach(() => {
    manager = new AuctionStateManager()
  })

  it('start session → add bids → end session → winner is highest bidder', () => {
    // 1. Start session
    manager.startSession(
      { name: 'Vintage Watch', imageUrl: null, startingPrice: 50000 },
      'session-001'
    )

    const afterStart = manager.getState()
    expect(afterStart.phase).toBe('active')
    expect(afterStart.sessionId).toBe('session-001')
    expect(afterStart.bids).toHaveLength(0)

    // 2. Add 3 bids in increasing order
    const r1 = manager.addBid('Alice', 51000)
    expect(r1.success).toBe(true)
    expect(r1.bid?.amount).toBe(51000)

    const r2 = manager.addBid('Bob', 56000)
    expect(r2.success).toBe(true)
    expect(r2.bid?.amount).toBe(56000)

    const r3 = manager.addBid('Carol', 62000)
    expect(r3.success).toBe(true)
    expect(r3.bid?.amount).toBe(62000)

    const afterBids = manager.getState()
    expect(afterBids.bids).toHaveLength(3)
    expect(afterBids.highestBid?.amount).toBe(62000)
    expect(afterBids.highestBid?.bidderName).toBe('Carol')

    // 3. End session
    const winner = manager.endSession()

    // 4. Verify winner
    expect(winner).not.toBeNull()
    expect(winner?.amount).toBe(62000)
    expect(winner?.bidderName).toBe('Carol')

    const finalState = manager.getState()
    expect(finalState.phase).toBe('ended')
    expect(finalState.winner?.amount).toBe(62000)
    expect(finalState.bids).toHaveLength(3)
  })

  it('rejects bids lower than or equal to current highest', () => {
    manager.startSession(
      { name: 'Test Item', imageUrl: null, startingPrice: 1000 },
      'session-002'
    )

    manager.addBid('Alice', 5000)

    // Equal bid — should be rejected
    const equalBid = manager.addBid('Bob', 5000)
    expect(equalBid.success).toBe(false)
    expect(equalBid.reason).toBeDefined()

    // Lower bid — should be rejected
    const lowerBid = manager.addBid('Carol', 4999)
    expect(lowerBid.success).toBe(false)

    // Bids list should still have only 1 entry
    expect(manager.getState().bids).toHaveLength(1)
  })

  it('rejects bids when auction is not active', () => {
    // Phase is 'idle' — no session started
    const result = manager.addBid('Alice', 1000)
    expect(result.success).toBe(false)
    expect(result.reason).toMatch(/not currently active/i)
  })

  it('endSession with no bids returns null winner', () => {
    manager.startSession(
      { name: 'Empty Auction', imageUrl: null, startingPrice: 100 },
      'session-003'
    )
    const winner = manager.endSession()
    expect(winner).toBeNull()
    expect(manager.getState().phase).toBe('ended')
  })
})
