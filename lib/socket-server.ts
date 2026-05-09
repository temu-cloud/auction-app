import type { Server, Socket } from "socket.io";
import { auctionStateManager } from "./auction-state";
import { prisma } from "./prisma";

/**
 * Wire up all Socket.IO event handlers for the Live Auction Display System.
 *
 * Server-authoritative design: clients send commands, the server validates,
 * mutates in-memory state, persists to DB where required, then broadcasts
 * updated state to all connected clients.
 */
export function setupSocketServer(io: Server): void {
  // ─── Server-side timer tick ─────────────────────────────────────────────────
  setInterval(async () => {
    const state = auctionStateManager.getState();

    if (state.timer.status !== "running") return;

    const remaining = auctionStateManager.getRemainingSeconds();

    if (remaining <= 0) {
      // Capture sessionId BEFORE endSession() clears it
      const sessionId = state.sessionId;
      const winner = auctionStateManager.endSession();

      if (sessionId) {
        try {
          await prisma.auctionSession.update({
            where: { id: sessionId },
            data: { status: "ENDED", endedAt: new Date() },
          });
        } catch (err) {
          console.error("[socket-server] Failed to persist auction end:", err);
        }
      }

      io.emit("auction:ended", { winner });
      io.emit("timer:tick", { remainingSeconds: 0 });
      return;
    }

    io.emit("timer:tick", { remainingSeconds: remaining });
  }, 1000);

  // ─── Per-connection handlers ────────────────────────────────────────────────
  io.on("connection", (socket: Socket) => {
    socket.emit("auction:state", auctionStateManager.getState());

    socket.on("request:state", () => {
      socket.emit("auction:state", auctionStateManager.getState());
    });

    socket.on(
      "bid:add",
      async (payload: { bidderName: string; amount: number }) => {
        const { bidderName, amount } = payload ?? {};
        const result = auctionStateManager.addBid(bidderName, amount);

        if (!result.success || !result.bid) {
          socket.emit("bid:rejected", { reason: result.reason });
          return;
        }

        const bid = result.bid;
        const sessionId = auctionStateManager.getState().sessionId;

        if (sessionId) {
          try {
            await prisma.bid.create({
              data: {
                id: bid.id,
                auctionSessionId: sessionId,
                bidderName: bid.bidderName,
                amount: bid.amount,
                createdAt: new Date(bid.timestamp),
              },
            });
          } catch (err) {
            console.error("[socket-server] Failed to persist bid:", err);
          }
        }

        io.emit("auction:bid", { bid });
      }
    );

    socket.on("timer:start", (payload: { durationSeconds: number }) => {
      const { durationSeconds } = payload ?? {};
      auctionStateManager.startTimer(durationSeconds);
      const state = auctionStateManager.getState();
      io.emit("timer:state", {
        status: state.timer.status,
        remainingSeconds: state.timer.remainingSeconds,
      });
    });

    socket.on("timer:pause", () => {
      auctionStateManager.pauseTimer();
      const state = auctionStateManager.getState();
      io.emit("timer:state", {
        status: state.timer.status,
        remainingSeconds: state.timer.remainingSeconds,
      });
    });

    socket.on("timer:reset", () => {
      auctionStateManager.resetTimer();
      const state = auctionStateManager.getState();
      io.emit("timer:state", {
        status: state.timer.status,
        remainingSeconds: state.timer.remainingSeconds,
      });
    });

    socket.on("sidebar:toggle", (payload: { visible: boolean }) => {
      const { visible } = payload ?? {};
      auctionStateManager.toggleSidebar(visible);
      io.emit("sidebar:state", { visible });
    });

    socket.on("auction:full-reset", () => {
      // Clears everything including item — returns all clients to first screen
      auctionStateManager.fullReset();
      io.emit("auction:reset", auctionStateManager.getState());
    });

    socket.on("auction:reset", () => {
      auctionStateManager.resetSession();
      io.emit("auction:reset", auctionStateManager.getState());
    });

    socket.on("auction:end", async () => {
      // Capture sessionId BEFORE endSession() clears it
      const sessionId = auctionStateManager.getState().sessionId;
      const winner = auctionStateManager.endSession();

      if (sessionId) {
        try {
          await prisma.auctionSession.update({
            where: { id: sessionId },
            data: { status: "ENDED", endedAt: new Date() },
          });
        } catch (err) {
          console.error("[socket-server] Failed to persist auction end:", err);
        }
      }

      io.emit("auction:ended", { winner });
    });
  });
}
