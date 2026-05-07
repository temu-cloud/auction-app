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

// ─── PUT /api/auction/item — Update item name and starting price ──────────────

export async function PUT(request: NextRequest) {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  let body: { itemName: string; startingPrice: number; itemImageUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { itemName, startingPrice, itemImageUrl } = body;

  if (!itemName || typeof itemName !== "string") {
    return Response.json({ error: "itemName is required" }, { status: 400 });
  }
  if (typeof startingPrice !== "number" || startingPrice < 0) {
    return Response.json(
      { error: "startingPrice must be a non-negative number" },
      { status: 400 }
    );
  }

  // Update in-memory state
  auctionStateManager.updateItem({
    name: itemName,
    imageUrl: itemImageUrl ?? null,
    startingPrice,
  });

  // Broadcast updated state to all connected clients so display + preview refresh
  getIO()?.emit("auction:state", auctionStateManager.getState());

  // Persist to DB if there's an active session
  const state = auctionStateManager.getState();
  const sessionId = state.sessionId;

  if (sessionId) {
    try {
      await prisma.auctionSession.update({
        where: { id: sessionId },
        data: {
          itemName,
          startingPrice,
          ...(itemImageUrl !== undefined && { itemImageUrl }),
        },
      });
    } catch (err) {
      console.error("Failed to update auction session item:", err);
      return Response.json(
        { error: "Failed to update item in database" },
        { status: 500 }
      );
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
