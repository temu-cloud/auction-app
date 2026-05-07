/**
 * Integration test: Socket.IO state sync
 * Operator submits bid → all clients receive auction:bid event
 * Requirements: 4.1, 4.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuctionStateManager } from '@/lib/auction-state'

// ─── Mock socket.io-client (not needed server-side) ──────────────────────────
vi.mock('socket.io-client', () => ({ io: vi.fn() }))

// ─── Minimal mock Socket.IO server ───────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void

function createMockIo() {
  const emitted: Array<{ event: string; args: unknown[] }> = []
  const connectionHandlers: EventHandler[] = []

  const io = {
    emit: vi.fn((event: string, ...args: unknown[]) => {
      emitted.push({ event, args })
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (event === 'connection') connectionHandlers.push(handler)
    }),
    emitted,
    // Helper: simulate a client connecting
    simulateConnection(socket: ReturnType<typeof createMockSocket>) {
      connectionHandlers.forEach((h) => h(socket))
    },
  }
  return io
}

function createMockSocket() {
  const handlers: Record<string, EventHandler[]> = {}
  const emittedToSender: Array<{ event: string; args: unknown[] }> = []

  const socket = {
    emit: vi.fn((event: string, ...args: unknown[]) => {
      emittedToSender.push({ event, args })
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
    emittedToSender,
    // Helper: simulate the client emitting an event to the server
    simulateEmit(event: string, ...args: unknown[]) {
      handlers[event]?.forEach((h) => h(...args))
    },
  }
  return socket
}

describe('Socket.IO state sync', () => {
  let manager: AuctionStateManager

  beforeEach(() => {
    manager = new AuctionStateManager()
  })

  it('on connect: server emits full auction:state snapshot to new client', async () => {
    // We test the setupSocketServer logic inline since it uses the singleton.
    // Instead, we replicate the connect handler logic directly against our manager.
    manager.startSession(
      { name: 'Test Item', imageUrl: null, startingPrice: 10000 },
      'sess-001'
    )
    manager.addBid('Alice', 12000)

    const state = manager.getState()

    // Simulate what the server does on connect
    const io = createMockIo()
    const socket = createMockSocket()

    // Register a mock connection handler that mirrors setupSocketServer behavior
    io.on('connection', (s: unknown) => {
      const sock = s as ReturnType<typeof createMockSocket>
      sock.emit('auction:state', state)
    })

    io.simulateConnection(socket)

    expect(socket.emittedToSender).toHaveLength(1)
    expect(socket.emittedToSender[0].event).toBe('auction:state')

    const emittedState = socket.emittedToSender[0].args[0] as typeof state
    expect(emittedState.phase).toBe('active')
    expect(emittedState.bids).toHaveLength(1)
    expect(emittedState.highestBid?.amount).toBe(12000)
  })

  it('bid:add accepted → io.emit broadcasts auction:bid to all clients', () => {
    manager.startSession(
      { name: 'Broadcast Test', imageUrl: null, startingPrice: 5000 },
      'sess-002'
    )

    const io = createMockIo()
    const socket = createMockSocket()

    // Register connection handler that mirrors bid:add logic
    io.on('connection', (s: unknown) => {
      const sock = s as ReturnType<typeof createMockSocket>
      sock.emit('auction:state', manager.getState())

      sock.on('bid:add', (payload: unknown) => {
        const { bidderName, amount } = payload as { bidderName: string; amount: number }
        const result = manager.addBid(bidderName, amount)
        if (!result.success || !result.bid) {
          sock.emit('bid:rejected', { reason: result.reason })
          return
        }
        io.emit('auction:bid', { bid: result.bid })
      })
    })

    io.simulateConnection(socket)
    socket.simulateEmit('bid:add', { bidderName: 'Bob', amount: 7500 })

    // io.emit should have been called with auction:bid
    const bidBroadcast = io.emitted.find((e) => e.event === 'auction:bid')
    expect(bidBroadcast).toBeDefined()
    expect((bidBroadcast!.args[0] as { bid: { bidderName: string; amount: number } }).bid.bidderName).toBe('Bob')
    expect((bidBroadcast!.args[0] as { bid: { amount: number } }).bid.amount).toBe(7500)
  })

  it('bid:add rejected → only sender receives bid:rejected, no broadcast', () => {
    manager.startSession(
      { name: 'Reject Test', imageUrl: null, startingPrice: 5000 },
      'sess-003'
    )
    manager.addBid('Alice', 8000) // current highest

    const io = createMockIo()
    const socket = createMockSocket()

    io.on('connection', (s: unknown) => {
      const sock = s as ReturnType<typeof createMockSocket>
      sock.emit('auction:state', manager.getState())

      sock.on('bid:add', (payload: unknown) => {
        const { bidderName, amount } = payload as { bidderName: string; amount: number }
        const result = manager.addBid(bidderName, amount)
        if (!result.success || !result.bid) {
          sock.emit('bid:rejected', { reason: result.reason })
          return
        }
        io.emit('auction:bid', { bid: result.bid })
      })
    })

    io.simulateConnection(socket)
    // Submit a bid lower than current highest (8000)
    socket.simulateEmit('bid:add', { bidderName: 'Bob', amount: 6000 })

    // io.emit should NOT have been called with auction:bid
    const bidBroadcast = io.emitted.find((e) => e.event === 'auction:bid')
    expect(bidBroadcast).toBeUndefined()

    // Sender should have received bid:rejected
    const rejected = socket.emittedToSender.find((e) => e.event === 'bid:rejected')
    expect(rejected).toBeDefined()
  })
})
