import { auth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
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

// ─── POST /api/auction/image — Upload item image to Cloudinary ────────────────

export async function POST(request: NextRequest) {
  const auth_result = await requireOperator();
  if (auth_result.error) return auth_result.error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Invalid multipart form data" },
      { status: 400 }
    );
  }

  const imageFile = formData.get("image");
  if (!imageFile || !(imageFile instanceof Blob)) {
    return Response.json(
      { error: "image field is required and must be a file" },
      { status: 400 }
    );
  }

  const filename =
    imageFile instanceof File ? imageFile.name : "auction-item";

  let url: string;
  try {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    url = await uploadImage(buffer, filename);
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Image upload failed",
      },
      { status: 400 }
    );
  }

  return Response.json({ url }, { status: 200 });
}
