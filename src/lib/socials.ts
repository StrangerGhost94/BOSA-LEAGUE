import { getSetting } from "@/lib/data";

/** The league's own social accounts, set in Control Room settings: shown in the footer and given to Google */
export const SOCIALS = [
  { key: "social_tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@bosaleague" },
  { key: "social_instagram", label: "Instagram", placeholder: "https://www.instagram.com/bosaleague" },
  { key: "social_facebook", label: "Facebook", placeholder: "https://www.facebook.com/bosaleague" },
  { key: "social_youtube", label: "YouTube", placeholder: "https://www.youtube.com/@bosaleague" },
  { key: "social_x", label: "X (Twitter)", placeholder: "https://x.com/bosaleague" },
  { key: "social_whatsapp", label: "WhatsApp channel", placeholder: "https://whatsapp.com/channel/..." },
] as const;

export async function getSocialLinks() {
  const values = await Promise.all(SOCIALS.map((s) => getSetting(s.key, "")));
  return SOCIALS.map((s, i) => ({ key: s.key, label: s.label, url: values[i] })).filter((s) => s.url);
}
