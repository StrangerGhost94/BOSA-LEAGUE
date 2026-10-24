import { NextResponse } from "next/server";
import { pool } from "@/db";
import { SITE_URL } from "@/lib/site";

/** Counts a click on a sponsor banner, then sends the visitor to the sponsor's website */
export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { rows } = await pool.query("update sponsor_ads set clicks = clicks + 1 where id = $1 and url is not null returning url", [id]);
  const url: string | undefined = rows[0]?.url;
  return NextResponse.redirect(url && /^https?:\/\//.test(url) ? url : SITE_URL, 302);
}
