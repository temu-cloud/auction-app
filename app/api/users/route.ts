import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireSuperOperator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "SUPER_OPERATOR") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// ─── GET /api/users — List all users ─────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const auth_result = await requireSuperOperator();
  if (auth_result.error) return auth_result.error;

  let users: { id: string; email: string; name: string; role: string; createdAt: Date }[];
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  return Response.json(users, { status: 200 });
}
