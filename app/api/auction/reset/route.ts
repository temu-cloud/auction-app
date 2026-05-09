import { auth } from "@/lib/auth";
import { auctionStateManager } from "@/lib/auction-state";
import { getIO } from "@/lib/socket-io";
import { headers } from "next/headers";

async function requireOperator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role === "UNASSIGNED") return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

// POST /api/auction/reset — full reset, clears everything including item
export async function POST() {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  auctionStateManager.fullReset();
  const cleanState = auctionStateManager.getState();

  // Broadcast to ALL connected clients
  getIO()?.emit("auction:reset", cleanState);

  return Response.json({ ok: true }, { status: 200 });
}
