import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sponsorAds } from "@/db/schema";

// Sponsor banners are public images (shown to visitors who are not members)
export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [row] = await db.select({ image: sponsorAds.image }).from(sponsorAds).where(eq(sponsorAds.id, id)).limit(1);
  if (!row?.image) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(row.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" } });
}
