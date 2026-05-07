import { vi } from 'vitest'

// Mock the Prisma generated client so tests don't require a real database
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn().mockImplementation(() => ({
    auctionSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mock-session-id' }),
      update: vi.fn().mockResolvedValue({}),
    },
    bid: {
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
  }))
  return { PrismaClient }
})

// Mock socket.io-client (browser-only, not needed in Node tests)
vi.mock('socket.io-client', () => ({ io: vi.fn() }))
