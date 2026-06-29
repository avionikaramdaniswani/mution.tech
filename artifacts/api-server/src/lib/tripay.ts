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

export const MIN_TOPUP_IDR = 3_000;
export const MAX_TOPUP_IDR = 10_000_000;

export const TOPUP_PRESETS = [3_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000];

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
