import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auctionStateManager } from "@/lib/auction-state";
import { getIO } from "@/lib/socket-io";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireOperator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role === "UNASSIGNED") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// ─── POST /api/auction/bid — Submit a new bid ─────────────────────────────────

export async function POST(request: NextRequest) {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  let body: { bidderName: string; amount: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bidderName, amount } = body;

  if (!bidderName || typeof bidderName !== "string") {
    return Response.json({ error: "bidderName is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return Response.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  const result = auctionStateManager.addBid(bidderName, amount);

  if (!result.success) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  const bid = result.bid!;

  // Broadcast the new bid to all connected clients immediately
  getIO()?.emit("auction:bid", { bid });

  const state = auctionStateManager.getState();
  const sessionId = state.sessionId;

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
      console.error("Failed to persist bid:", err);
      // Bid is accepted in-memory; log and continue (eventual consistency)
    }
  }

  return Response.json({ bid }, { status: 200 });
}
