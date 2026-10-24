import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bosa_session";
const encoder = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters).");
    return encoder.encode("dev-only-insecure-secret-change-me");
  }
  return encoder.encode(s);
}

/** sv: session version. For members it must match users.session_version, so only the latest sign-in works. */
export type SessionPayload = { uid: string; role: string; name: string; sv?: number };

export async function signSession(p: SessionPayload) {
  return new SignJWT(p as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Link token for confirming an email address: tied to the address, so it stops working if the email changes */
export async function signEmailToken(uid: string, email: string) {
  return new SignJWT({ uid, email, purpose: "verify-email" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function verifyEmailToken(token?: string | null): Promise<{ uid: string; email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "verify-email" || typeof payload.uid !== "string" || typeof payload.email !== "string") return null;
    return { uid: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}
