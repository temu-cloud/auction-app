import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auctionStateManager } from "@/lib/auction-state";
import { getIO } from "@/lib/socket-io";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

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

// ─── POST /api/auction/session — Start a new auction session ─────────────────

export async function POST(request: NextRequest) {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  const currentPhase = auctionStateManager.getState().phase;
  if (currentPhase === "active") {
    return NextResponse.json(
      { error: "An auction is already active. End the current auction before starting a new one." },
      { status: 409 }
    );
  }
  // If ended, auto-reset before starting the new session
  if (currentPhase === "ended") {
    auctionStateManager.resetSession();
  }

  let body: { itemName: string; itemImageUrl?: string; startingPrice: number; hostedBy?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { itemName, itemImageUrl, startingPrice, hostedBy } = body;

  if (!itemName || typeof itemName !== "string") {
    return Response.json({ error: "itemName is required" }, { status: 400 });
  }
  if (typeof startingPrice !== "number" || startingPrice < 0) {
    return Response.json(
      { error: "startingPrice must be a non-negative number" },
      { status: 400 }
    );
  }

  let dbSession: { id: string };
  try {
    dbSession = await prisma.auctionSession.create({
      data: {
        itemName,
        itemImageUrl: itemImageUrl ?? null,
        startingPrice,
        hostedBy: hostedBy ?? "",
        status: "ACTIVE",
      },
    });
  } catch (err) {
    console.error("Failed to create auction session:", err);
    return Response.json(
      { error: "Failed to create auction session" },
      { status: 500 }
    );
  }

  auctionStateManager.startSession(
    {
      name: itemName,
      imageUrl: itemImageUrl ?? null,
      startingPrice,
      hostedBy: hostedBy ?? "",
    },
    dbSession.id
  );

  // Broadcast full state so display screen transitions to active immediately
  const io = getIO();
  if (io) {
    io.emit("auction:state", auctionStateManager.getState());
  } else {
    console.warn("[auction/session] Socket.IO server not available — broadcast skipped. Display clients will pull state on next connect.");
  }

  return Response.json({ sessionId: dbSession.id }, { status: 200 });
}

// ─── DELETE /api/auction/session — End the current auction session ────────────

export async function DELETE(_request: NextRequest) {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  // Capture sessionId BEFORE endSession() clears it
  const sessionId = auctionStateManager.getState().sessionId;
  const winner = auctionStateManager.endSession();

  if (sessionId) {
    try {
      await prisma.auctionSession.update({
        where: { id: sessionId },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Failed to update auction session status:", err);
    }
  }

  getIO()?.emit("auction:ended", { winner });

  return Response.json({ winner }, { status: 200 });
}
