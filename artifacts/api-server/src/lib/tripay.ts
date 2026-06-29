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

export const CREDIT_PACKAGES = [
  { id: "starter",    label: "Starter",    idr: 50_000,  credits: 50_000,  bonus: 0  },
  { id: "basic",      label: "Basic",      idr: 100_000, credits: 110_000, bonus: 10 },
  { id: "pro",        label: "Pro",        idr: 250_000, credits: 300_000, bonus: 20 },
  { id: "enterprise", label: "Enterprise", idr: 500_000, credits: 650_000, bonus: 30 },
] as const;

export type PackageId = (typeof CREDIT_PACKAGES)[number]["id"];

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
