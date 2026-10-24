import "server-only";
import { pool } from "@/db";

export const PLACEMENTS = [
  { value: "ALL", label: "Everywhere (all banner spots)" },
  { value: "HOME", label: "Home page" },
  { value: "LEAGUE", label: "League table page" },
  { value: "FIXTURES", label: "Fixtures & results page" },
] as const;
export type Placement = Exclude<(typeof PLACEMENTS)[number]["value"], "ALL">;

export type SponsorBanner = { id: string; sponsor: string; width: number; height: number; hasLink: boolean };

/** One running banner for this spot, picked at random among those booked for it (or for everywhere), and counted as seen */
export async function pickSponsorBanner(placement: Placement): Promise<SponsorBanner | null> {
  const { rows } = await pool.query(
    `update sponsor_ads set impressions = impressions + 1
      where id = (select id from sponsor_ads
                   where active and placement in ('ALL', $1)
                     and (starts_on is null or starts_on <= now()) and (ends_on is null or ends_on > now())
                   order by random() limit 1)
      returning id, sponsor, width, height, url is not null as "hasLink"`,
    [placement],
  );
  return rows[0] ?? null;
}
