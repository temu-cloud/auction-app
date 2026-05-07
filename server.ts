import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { auctionStateManager } from "./lib/auction-state";
import { setupSocketServer } from "./lib/socket-server";
import { setIO } from "./lib/socket-io";

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const httpServer = createServer();

// Next.js request handler — obtained synchronously, safe to register before
// app.prepare() resolves.
const app = next({ dev, port });
const handle = app.getRequestHandler();

// Register the Next.js handler FIRST, before Socket.IO attaches.
// engine.io's attach() snapshots all existing "request" listeners, removes
// them, then re-adds its own listener that routes /socket.io/* to itself and
// delegates everything else back to the snapshotted listeners.
// So: register handle → attach Socket.IO → listen().
httpServer.on("request", (req, res) => {
  handle(req, res);
});

// Attach Socket.IO after the Next.js handler is registered so engine.io
// captures it in its snapshot and delegates non-socket.io requests to it.
const io = new Server(httpServer, {
  cors: {
    origin: dev
      ? `http://localhost:${port}`
      : process.env.BETTER_AUTH_URL ?? true,
    credentials: true,
  },
});

setupSocketServer(io);
setIO(io);

app.prepare().then(async () => {
  await auctionStateManager.rehydrateFromDb();

  httpServer.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`
    );
  });
});
