import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "UNASSIGNED") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sessions = await prisma.auctionSession.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      bids: { orderBy: { amount: "desc" } },
    },
  });

  return NextResponse.json(sessions);
}
