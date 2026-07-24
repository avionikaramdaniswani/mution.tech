import { createHmac } from "crypto";

const SANDBOX_BASE = "https://tripay.co.id/api-sandbox";
const PROD_BASE = "https://tripay.co.id/api";

export function getTripayBase(): string {
  return process.env.TRIPAY_MODE === "production" ? PROD_BASE : SANDBOX_BASE;
}

export function createOrderSignature(
  merchantCode: string,
  merchantRef: string,
  amount: number,
  privateKey: string,
): string {
  return createHmac("sha256", privateKey)
    .update(merchantCode + merchantRef + amount)
    .digest("hex");
}

export function verifyCallbackSignature(
  rawBody: string,
  signature: string,
  privateKey: string,
): boolean {
  const expected = createHmac("sha256", privateKey).update(rawBody).digest("hex");
  return expected === signature;
}

export const MIN_TOPUP_IDR = 1_000;
export const MAX_TOPUP_IDR = 10_000_000;

export const TOPUP_PRESETS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000];

export interface TripayChannel {
  group: string;
  code: string;
  name: string;
  type: string;
  fee_merchant: { flat: number; percent: number };
  fee_customer: { flat: number; percent: number };
  total_fee: { flat: number; percent: string };
  minimum_fee: number;
  maximum_fee: number;
  minimum_amount: number;
  maximum_amount: number;
  icon_url: string;
  active: boolean;
}

let _channelCache: TripayChannel[] | null = null;
let _channelCacheAt = 0;
const CHANNEL_CACHE_MS = 15 * 60 * 1000;

export async function getPaymentChannels(apiKey: string, base: string): Promise<TripayChannel[]> {
  const now = Date.now();
  if (_channelCache && now - _channelCacheAt < CHANNEL_CACHE_MS) {
    return _channelCache;
  }
  const res = await fetch(`${base}/merchant/payment-channel`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`TriPay channel fetch failed: ${res.status}`);
  const json = await res.json() as { success: boolean; data: TripayChannel[] };
  if (!json.success) throw new Error("TriPay returned success=false for payment-channel");
  _channelCache = json.data.filter((c) => c.active);
  _channelCacheAt = now;
  return _channelCache;
}

export interface TripayCreateResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    merchant_ref: string;
    payment_url: string;
    checkout_url: string;
    status: string;
  };
}

export interface TripayTransactionDetail {
  success: boolean;
  message: string;
  data: {
    reference: string;
    merchant_ref: string;
    status: "UNPAID" | "PAID" | "FAILED" | "EXPIRED" | "REFUND";
    payment_name: string;
    total_amount: number;
    paid_at?: number | null;
  };
}

export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_name: string;
  total_amount: number;
  status: "PAID" | "FAILED" | "EXPIRED" | "REFUND" | "UNPAID";
  paid_at?: number;
  signature: string;
}
