// Grow (Meshulam) "Light" API: hosted payment page + server-to-server callback.
const PRODUCTION_API = "https://secure.meshulam.co.il/api/light/server/1.0";
const SANDBOX_API = "https://sandbox.meshulam.co.il/api/light/server/1.0";

export function growConfigured() {
  return Boolean(process.env.GROW_USER_ID && process.env.GROW_PAGE_CODE);
}

function apiBase() {
  return process.env.GROW_SANDBOX === "true" ? SANDBOX_API : PRODUCTION_API;
}

async function post(method: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const res = await fetch(`${apiBase()}/${method}`, { method: "POST", body });
  const json = (await res.json().catch(() => null)) as {
    status?: number | string;
    err?: { message?: string } | string;
    data?: Record<string, unknown>;
  } | null;
  return { ok: res.ok && String(json?.status) === "1", json };
}

// Grow rejects special characters, so keep descriptions plain.
const plain = (text: string) => text.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();

export async function createGrowPayment(input: {
  bookingId: string;
  amount: number;
  description: string;
  fullName: string;
  phone: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}) {
  const { ok, json } = await post("createPaymentProcess", {
    pageCode: process.env.GROW_PAGE_CODE!,
    userId: process.env.GROW_USER_ID!,
    sum: input.amount.toFixed(2),
    description: plain(input.description).slice(0, 100),
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    notifyUrl: input.notifyUrl,
    "pageField[fullName]": plain(input.fullName),
    "pageField[phone]": input.phone.replace(/\D/g, ""),
    "pageField[email]": input.email,
    cField1: input.bookingId,
  });
  const data = json?.data as { url?: string; processId?: number | string; processToken?: string } | undefined;
  if (!ok || !data?.url || data.processId == null) {
    throw new Error(`Grow createPaymentProcess failed: ${JSON.stringify(json?.err ?? json)}`);
  }
  return { url: data.url, processId: String(data.processId), processToken: String(data.processToken ?? "") };
}

// Acknowledge the callback. The charge succeeds even if this fails, so it is best-effort.
export async function approveGrowTransaction(data: Record<string, string>) {
  try {
    await post("approveTransaction", {
      pageCode: process.env.GROW_PAGE_CODE!,
      ...Object.fromEntries(
        ["transactionId", "transactionToken", "processId", "processToken", "asmachta", "sum", "fullName", "payerPhone", "payerEmail", "paymentType", "paymentDate", "cardSuffix", "cardType", "cardBrand", "cardExp", "paymentsNum", "allPaymentsNum", "firstPaymentSum", "periodicalPaymentSum", "transactionTypeId", "statusCode"]
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]])
      ),
    });
  } catch (err) {
    console.error("Grow approveTransaction failed:", err);
  }
}
