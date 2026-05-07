/**
 * Preservation Property Tests for auction-flow-bugs
 *
 * These tests MUST PASS on unfixed code — they establish the baseline behavior
 * that must not regress after the six bug fixes are applied.
 *
 * Property 7  — Bid Monotonicity
 * Property 10 — Sidebar Toggle
 * Property    — Highest bid tracking
 * Property    — Reset session clears transient state
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AuctionStateManager } from '@/lib/auction-state'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate an array of integers in [min, max] */
function range(min: number, max: number, step = 1): number[] {
  const out: number[] = []
  for (let v = min; v <= max; v += step) out.push(v)
  return out
}

describe('Preservation Property Tests', () => {
  let manager: AuctionStateManager

  beforeEach(() => {
    manager = new AuctionStateManager()
  })

  // ─── Property 7: Bid Monotonicity ─────────────────────────────────────────
  describe('Property 7 — Bid Monotonicity', () => {
    it('addBid() rejects any bid amount <= current highest bid', () => {
      manager.startSession(
        { name: 'Test Item', imageUrl: null, startingPrice: 1000 },
        'session-mono'
      )

      // Establish a highest bid of 10 000
      const first = manager.addBid('Alice', 10_000)
      expect(first.success).toBe(true)

      // For all amounts <= 10 000, addBid must return { success: false }
      const rejectedAmounts = [1, 500, 999, 9_999, 10_000]
      for (const amount of rejectedAmounts) {
        const result = manager.addBid('Bob', amount)
        expect(result.success, `amount ${amount} should be rejected`).toBe(false)
        // State must be unchanged — still only 1 bid
        expect(manager.getState().bids).toHaveLength(1)
        expect(manager.getState().highestBid?.amount).toBe(10_000)
      }
    })

    it('addBid() accepts strictly increasing bids and state reflects each', () => {
      manager.startSession(
        { name: 'Test Item', imageUrl: null, startingPrice: 0 },
        'session-incr'
      )

      const amounts = [100, 200, 300, 400, 500]
      for (let i = 0; i < amounts.length; i++) {
        const result = manager.addBid(`Bidder${i}`, amounts[i])
        expect(result.success, `amount ${amounts[i]} should be accepted`).toBe(true)
        expect(manager.getState().highestBid?.amount).toBe(amounts[i])
        expect(manager.getState().bids).toHaveLength(i + 1)
      }
    })

    it('addBid() rejects bids when phase is not active', () => {
      // idle phase
      const idleResult = manager.addBid('Alice', 5000)
      expect(idleResult.success).toBe(false)
      expect(idleResult.reason).toMatch(/not currently active/i)

      // ended phase
      manager.startSession({ name: 'Item', imageUrl: null, startingPrice: 0 }, 's1')
      manager.endSession()
      const endedResult = manager.addBid('Bob', 5000)
      expect(endedResult.success).toBe(false)
    })
  })

  // ─── Highest bid is always the maximum ────────────────────────────────────
  describe('Highest bid tracking', () => {
    it('highestBid is always the bid with the maximum amount', () => {
      manager.startSession(
        { name: 'Item', imageUrl: null, startingPrice: 0 },
        'session-max'
      )

      // Add bids in various orders — highest should always track the max
      const bids = [
        { name: 'A', amount: 1000 },
        { name: 'B', amount: 5000 },
        { name: 'C', amount: 3000 }, // rejected — lower than 5000
        { name: 'D', amount: 7500 },
        { name: 'E', amount: 6000 }, // rejected — lower than 7500
        { name: 'F', amount: 9000 },
      ]

      let expectedHighest = 0
      for (const bid of bids) {
        const result = manager.addBid(bid.name, bid.amount)
        if (bid.amount > expectedHighest) {
          expect(result.success).toBe(true)
          expectedHighest = bid.amount
        } else {
          expect(result.success).toBe(false)
        }
        expect(manager.getState().highestBid?.amount ?? 0).toBe(expectedHighest)
      }
    })

    it('highestBid is null when no bids have been placed', () => {
      manager.startSession(
        { name: 'Item', imageUrl: null, startingPrice: 500 },
        'session-nobids'
      )
      expect(manager.getState().highestBid).toBeNull()
    })
  })

  // ─── Property 10: Sidebar Toggle ──────────────────────────────────────────
  describe('Property 10 — Sidebar Toggle', () => {
    it('sidebarVisible always matches the visible argument passed to toggleSidebar()', () => {
      // Test all combinations: true, false, true, false
      const toggleSequence = [true, false, true, false, true]
      for (const visible of toggleSequence) {
        manager.toggleSidebar(visible)
        expect(
          manager.getState().sidebarVisible,
          `sidebarVisible should be ${visible} after toggleSidebar(${visible})`
        ).toBe(visible)
      }
    })

    it('sidebar toggle is independent of auction phase', () => {
      // idle phase
      manager.toggleSidebar(true)
      expect(manager.getState().sidebarVisible).toBe(true)

      // active phase
      manager.startSession({ name: 'Item', imageUrl: null, startingPrice: 0 }, 's1')
      manager.toggleSidebar(false)
      expect(manager.getState().sidebarVisible).toBe(false)

      // ended phase
      manager.endSession()
      manager.toggleSidebar(true)
      expect(manager.getState().sidebarVisible).toBe(true)
    })
  })

  // ─── Reset session clears transient state ─────────────────────────────────
  describe('resetSession() clears transient state', () => {
    it('after resetSession(), phase is idle, bids is empty, winner is null, timer is stopped', () => {
      // Set up a completed auction with bids
      manager.startSession(
        { name: 'Watch', imageUrl: null, startingPrice: 1000 },
        'session-reset'
      )
      manager.addBid('Alice', 2000)
      manager.addBid('Bob', 3000)
      manager.startTimer(60)
      manager.endSession()

      // Verify ended state has bids and winner
      const ended = manager.getState()
      expect(ended.phase).toBe('ended')
      expect(ended.bids).toHaveLength(2)
      expect(ended.winner).not.toBeNull()

      // Reset
      manager.resetSession()
      const reset = manager.getState()

      expect(reset.phase).toBe('idle')
      expect(reset.bids).toHaveLength(0)
      expect(reset.winner).toBeNull()
      expect(reset.timer.status).toBe('stopped')
      expect(reset.sessionId).toBeNull()
    })

    it('resetSession() is safe to call multiple times', () => {
      manager.resetSession()
      manager.resetSession()
      const state = manager.getState()
      expect(state.phase).toBe('idle')
      expect(state.bids).toHaveLength(0)
      expect(state.winner).toBeNull()
    })

    it('resetSession() across many start/end cycles always produces clean idle state', () => {
      // Simulate multiple auction cycles
      for (let i = 0; i < 5; i++) {
        manager.startSession(
          { name: `Item ${i}`, imageUrl: null, startingPrice: i * 100 },
          `session-${i}`
        )
        // Add some bids
        for (const amount of range(i * 100 + 100, i * 100 + 500, 100)) {
          manager.addBid(`Bidder${amount}`, amount)
        }
        manager.endSession()
        manager.resetSession()

        const state = manager.getState()
        expect(state.phase, `cycle ${i}: phase should be idle`).toBe('idle')
        expect(state.bids, `cycle ${i}: bids should be empty`).toHaveLength(0)
        expect(state.winner, `cycle ${i}: winner should be null`).toBeNull()
        expect(state.timer.status, `cycle ${i}: timer should be stopped`).toBe('stopped')
      }
    })
  })
})
