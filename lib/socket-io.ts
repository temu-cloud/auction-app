/**
 * Singleton holder for the Socket.IO server instance.
 * API routes import `getIO()` to broadcast events without needing a direct
 * reference to the io object created in server.ts.
 */
import type { Server } from "socket.io";

const g = globalThis as unknown as { __io?: Server };

export function setIO(io: Server): void {
  g.__io = io;
}

export function getIO(): Server | undefined {
  return g.__io;
}
