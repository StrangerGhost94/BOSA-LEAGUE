import "server-only";
import { createHmac, randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { APP_URL, SITE_DOMAIN, SITE_URL } from "./site";
import { signEmailToken } from "./session";
import { isStaff } from "./roles";

/**
 * Sends email from the league's own domain through Resend (https://resend.com).
 * Set RESEND_API_KEY once bosaleague.xyz is verified there; EMAIL_FROM is optional.
 */
const FROM = () => process.env.EMAIL_FROM || `BOSA League <no-reply@${SITE_DOMAIN}>`;

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/** A fan who has not confirmed their email yet (staff are never asked, and nobody is asked while email is off) */
export function needsEmailConfirmation(u: { emailVerifiedAt: Date | null; role: string }) {
  return emailConfigured() && !u.emailVerifiedAt && !isStaff(u.role);
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!emailConfigured()) {
    console.log(`[email] not sent (RESEND_API_KEY not set): "${msg.subject}" to ${msg.to}`);
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}) }),
    });
    if (!r.ok) console.error(`[email] Resend refused "${msg.subject}" to ${msg.to}: ${r.status} ${await r.text()}`);
    return r.ok;
  } catch (e) {
    console.error(`[email] could not reach Resend for "${msg.subject}" to ${msg.to}:`, e);
    return false;
  }
}

/** League crest at the top of every email (a hosted PNG: Gmail and Outlook do not show SVG or embedded images reliably) */
const LOGO = `<p style="text-align:center;margin:0 0 24px"><img src="${SITE_URL}/brand/email-logo.png" width="96" height="104" alt="BOSA League" style="display:inline-block;border:0;outline:none;text-decoration:none"></p>`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const hashCode = (code: string) => createHmac("sha256", process.env.AUTH_SECRET || "dev-only").update(code).digest("hex");

/** Emails a 6-digit code (valid 30 minutes, replaces any earlier one) and a link (valid 7 days); either confirms the address */
export async function sendVerificationEmail(u: { id: string; name: string; email: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.update(users).set({ emailCodeHash: hashCode(code), emailCodeExpires: new Date(Date.now() + 30 * 60_000) }).where(eq(users.id, u.id));
  const link = `${APP_URL}/confirm-email?token=${encodeURIComponent(await signEmailToken(u.id, u.email))}`;
  const first = u.name.split(/\s+/)[0] || u.name;
  return sendEmail({
    to: u.email,
    subject: `${code} is your BOSA League code`,
    text: `Hi ${first},\n\nYour BOSA League confirmation code is: ${code}\n\nEnter it in your account within 30 minutes. Or confirm by opening this link:\n\n${link}\n\nThe link works for 7 days. If you did not create an account, you can ignore this email.\n\nBOSA League\n${SITE_DOMAIN}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0A0F1E">
  ${LOGO}
  <h2 style="margin:0 0 16px">Confirm your email</h2>
  <p>Hi ${esc(first)},</p>
  <p>Your BOSA League confirmation code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
  <p style="font-size:13px;color:#555">Enter it in your account within 30 minutes. Or confirm with the button:</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#D6B676;color:#0A0F1E;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Confirm my email</a></p>
  <p style="font-size:13px;color:#555">The link works for 7 days. If the button does not work, copy this address into your browser:<br><a href="${link}" style="color:#555;word-break:break-all">${link}</a></p>
  <p style="font-size:13px;color:#555">If you did not create an account, you can ignore this email.</p>
  <p style="font-size:13px;color:#555">BOSA League · ${SITE_DOMAIN}</p>
</div>`,
  });
}

/** Forgot password: emails a 6-digit code (valid 15 minutes, replaces any earlier one) */
export async function sendPasswordResetEmail(u: { id: string; name: string; email: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.update(users).set({ resetCodeHash: hashCode(code), resetCodeExpires: new Date(Date.now() + 15 * 60_000) }).where(eq(users.id, u.id));
  const first = u.name.split(/\s+/)[0] || u.name;
  return sendEmail({
    to: u.email,
    subject: `${code} is your BOSA League password reset code`,
    text: `Hi ${first},\n\nYour BOSA League password reset code is: ${code}\n\nEnter it on the reset page within 15 minutes to choose a new password.\n\nIf you did not ask to reset your password, ignore this email: your password stays the same.\n\nBOSA League\n${SITE_DOMAIN}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0A0F1E">
  ${LOGO}
  <h2 style="margin:0 0 16px">Reset your password</h2>
  <p>Hi ${esc(first)},</p>
  <p>Your BOSA League password reset code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
  <p style="font-size:13px;color:#555">Enter it on the reset page within 15 minutes to choose a new password.</p>
  <p style="font-size:13px;color:#555">If you did not ask to reset your password, ignore this email: your password stays the same.</p>
  <p style="font-size:13px;color:#555">BOSA League · ${SITE_DOMAIN}</p>
</div>`,
  });
}
