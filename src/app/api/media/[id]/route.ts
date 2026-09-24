import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";

// Photos are members-only. The tiny blurred "teaser" is public so locked albums still look inviting.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const size = new URL(req.url).searchParams.get("v") ?? "thumb";
  const col = size === "full" ? media.full : size === "teaser" ? media.teaser : media.thumb;
  if (size !== "teaser") {
    const u = await getCurrentUser();
    if (!hasMembership(u)) return new NextResponse("Members only", { status: 403 });
  }
  const [row] = await db.select({ data: col }).from(media).where(eq(media.id, params.id)).limit(1);
  if (!row?.data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": size === "teaser" ? "public, max-age=604800, immutable" : "private, max-age=86400",
    },
  });
}
