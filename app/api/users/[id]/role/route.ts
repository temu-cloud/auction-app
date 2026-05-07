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

// ─── PATCH /api/users/[id]/role — Update a user's role ───────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth_result = await requireSuperOperator();
  if (auth_result.error) return auth_result.error;

  const { id } = await params;

  let body: { role: "SUPER_OPERATOR" | "OPERATOR" | "UNASSIGNED" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role } = body;
  const validRoles = ["SUPER_OPERATOR", "OPERATOR", "UNASSIGNED"] as const;
  if (!validRoles.includes(role)) {
    return Response.json(
      {
        error:
          "role must be one of: SUPER_OPERATOR, OPERATOR, UNASSIGNED",
      },
      { status: 400 }
    );
  }

  // Enforce invariant: cannot remove the last SUPER_OPERATOR
  if (role !== "SUPER_OPERATOR") {
    let superOperatorCount: number;
    try {
      superOperatorCount = await prisma.user.count({
        where: { role: "SUPER_OPERATOR" },
      });
    } catch (err) {
      console.error("Failed to count super operators:", err);
      return Response.json(
        { error: "Failed to validate role change" },
        { status: 500 }
      );
    }

    // Check if the target user is currently a SUPER_OPERATOR
    let targetUser: { role: string } | null;
    try {
      targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
    } catch (err) {
      console.error("Failed to fetch target user:", err);
      return Response.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (
      targetUser.role === "SUPER_OPERATOR" &&
      superOperatorCount <= 1
    ) {
      return Response.json(
        {
          error:
            "Cannot remove the last SUPER_OPERATOR. Assign another user as SUPER_OPERATOR first.",
        },
        { status: 400 }
      );
    }
  }

  let updatedUser: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
  };
  try {
    updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  } catch (err: unknown) {
    // Prisma P2025 = record not found
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Failed to update user role:", err);
    return Response.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }

  return Response.json(updatedUser, { status: 200 });
}
