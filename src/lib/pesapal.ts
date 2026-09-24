import "server-only";

/**
 * Pesapal API 3.0 client.
 * Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 */
const BASE = () =>
  process.env.PESAPAL_ENV === "live" ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3";

export function pesapalConfigured() {
  return !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
}

let tokenCache: { token: string; expires: number } | null = null;
let ipnCache: string | null = null;

async function call<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (init.auth !== false) headers.Authorization = `Bearer ${await getToken()}`;
  const res = await fetch(`${BASE()}${path}`, { ...init, headers, cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } | null };
  if (!res.ok || (json && json.error && (json.error.message || json.error.code))) {
    throw new Error(`Pesapal error on ${path}: ${json?.error?.message ?? json?.error?.code ?? res.status}`);
  }
  return json;
}

async function getToken() {
  if (tokenCache && tokenCache.expires > Date.now() + 30_000) return tokenCache.token;
  const r = await call<{ token: string; expiryDate: string }>("/api/Auth/RequestToken", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  tokenCache = { token: r.token, expires: new Date(r.expiryDate).getTime() || Date.now() + 4 * 60_000 };
  return r.token;
}

async function getIpnId() {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID;
  if (ipnCache) return ipnCache;
  const url = `${process.env.APP_URL}/api/payments/pesapal/ipn`;
  const list = await call<{ url: string; ipn_id: string }[]>("/api/URLSetup/GetIpnList", { method: "GET" }).catch(() => []);
  const found = Array.isArray(list) ? list.find((x) => x.url === url) : undefined;
  if (found) return (ipnCache = found.ipn_id);
  const r = await call<{ ipn_id: string }>("/api/URLSetup/RegisterIPN", {
    method: "POST",
    body: JSON.stringify({ url, ipn_notification_type: "GET" }),
  });
  ipnCache = r.ipn_id;
  return r.ipn_id;
}

export async function submitOrder(input: {
  merchantRef: string;
  amount: number;
  currency: string;
  description: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
}) {
  const notification_id = await getIpnId();
  return call<{ order_tracking_id: string; merchant_reference: string; redirect_url: string }>(
    "/api/Transactions/SubmitOrderRequest",
    {
      method: "POST",
      body: JSON.stringify({
        id: input.merchantRef,
        currency: input.currency,
        amount: input.amount,
        description: input.description,
        callback_url: `${process.env.APP_URL}/membership/callback`,
        notification_id,
        billing_address: {
          email_address: input.email,
          phone_number: input.phone ?? "",
          country_code: "UG",
          first_name: input.firstName,
          last_name: input.lastName,
        },
      }),
    },
  );
}

export async function getTransactionStatus(orderTrackingId: string) {
  return call<{
    payment_method: string;
    amount: number;
    confirmation_code: string;
    payment_status_description: string; // "Completed" | "Failed" | "Invalid" | "Reversed"
    status_code: number; // 1 completed, 2 failed, 0 invalid, 3 reversed
    merchant_reference: string;
    currency: string;
  }>(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, { method: "GET" });
}
