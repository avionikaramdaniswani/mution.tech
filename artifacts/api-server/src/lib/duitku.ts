import { createHmac, createHash } from "crypto";

const SANDBOX_BASE = "https://sandbox.duitku.com/webapi";
const PROD_BASE = "https://passport.duitku.com/webapi";

export function getDuitkuBase(): string {
  return process.env.DUITKU_MODE === "production" ? PROD_BASE : SANDBOX_BASE;
}

/**
 * Signature untuk Get Payment Method
 * Formula: HMAC-SHA256(merchantCode + amount + datetime, apiKey)
 */
export function createPaymentMethodSignature(
  merchantCode: string,
  amount: number,
  datetime: string,
  apiKey: string,
): string {
  const stringToSign = merchantCode + amount + datetime;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

/**
 * Signature untuk Request Transaksi (Inquiry)
 * Formula: HMAC-SHA256(merchantCode + merchantOrderId + paymentAmount, apiKey)
 */
export function createInquirySignature(
  merchantCode: string,
  merchantOrderId: string,
  paymentAmount: number,
  apiKey: string,
): string {
  const stringToSign = merchantCode + merchantOrderId + paymentAmount;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

/**
 * Signature untuk Cek Status Transaksi
 * Formula: MD5(merchantCode + merchantOrderId + apiKey)
 */
export function createCheckStatusSignature(
  merchantCode: string,
  merchantOrderId: string,
  apiKey: string,
): string {
  return createHash("md5").update(merchantCode + merchantOrderId + apiKey).digest("hex");
}

/**
 * Verifikasi callback dari Duitku
 * Formula: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */
export function verifyCallbackSignature(
  merchantCode: string,
  amount: string,
  merchantOrderId: string,
  apiKey: string,
  receivedSignature: string,
): boolean {
  const expected = createHash("md5")
    .update(merchantCode + amount + merchantOrderId + apiKey)
    .digest("hex");
  return expected === receivedSignature;
}

export const MIN_TOPUP_IDR = 10_000;
export const MAX_TOPUP_IDR = 10_000_000;

export const TOPUP_PRESETS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

// ---------- Types ----------

export interface DuitkuChannel {
  paymentMethod: string;
  paymentName: string;
  paymentImage: string;
  totalFee: string;
}

export interface DuitkuInquiryResponse {
  merchantCode: string;
  reference: string;
  paymentUrl: string;
  vaNumber?: string;
  qrString?: string;
  amount: string;
  statusCode: string;
  statusMessage: string;
}

export interface DuitkuCallbackPayload {
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  productDetail: string;
  additionalParam: string;
  paymentCode: string;       // payment method code
  resultCode: string;        // "00" = success, "01" = pending, "02" = failed
  merchantUserId: string;
  reference: string;
  signature: string;
  publisherOrderId: string;
  spUserHash: string;
  settlementDate: string;
  issuerCode: string;
}

export interface DuitkuCheckStatusResponse {
  merchantOrderId: string;
  reference: string;
  amount: string;
  statusCode: string;        // "00" = success, "01" = pending, "02" = cancelled
  statusMessage: string;
}

// ---------- API Functions ----------

let _channelCache: DuitkuChannel[] | null = null;
let _channelCacheAt = 0;
const CHANNEL_CACHE_MS = 15 * 60 * 1000;

/**
 * Duitku datetime format: "yyyy-MM-dd HH:mm:ss"
 */
function getDuitkuDatetime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function getPaymentChannels(
  merchantCode: string,
  apiKey: string,
  amount: number,
  base: string,
): Promise<DuitkuChannel[]> {
  const now = Date.now();
  if (_channelCache && now - _channelCacheAt < CHANNEL_CACHE_MS) {
    return _channelCache;
  }

  const datetime = getDuitkuDatetime();
  const signature = createPaymentMethodSignature(merchantCode, amount, datetime, apiKey);

  const res = await fetch(`${base}/api/merchant/paymentmethod/getpaymentmethod`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantcode: merchantCode,
      amount,
      datetime,
      signature,
    }),
  });

  if (!res.ok) throw new Error(`Duitku channel fetch failed: ${res.status}`);
  const json = await res.json() as {
    paymentFee?: DuitkuChannel[];
    responseCode?: string;
    responseMessage?: string;
  };

  if (json.responseCode !== "00" || !json.paymentFee) {
    throw new Error(`Duitku returned error: ${json.responseMessage ?? "Unknown"}`);
  }

  _channelCache = json.paymentFee;
  _channelCacheAt = now;
  return _channelCache;
}

export async function createTransaction(opts: {
  merchantCode: string;
  apiKey: string;
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod: string;
  productDetails: string;
  email: string;
  customerVaName: string;
  phoneNumber?: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod?: number;
  base: string;
}): Promise<DuitkuInquiryResponse> {
  const signature = createInquirySignature(
    opts.merchantCode,
    opts.merchantOrderId,
    opts.paymentAmount,
    opts.apiKey,
  );

  const body: Record<string, unknown> = {
    merchantCode: opts.merchantCode,
    paymentAmount: opts.paymentAmount,
    paymentMethod: opts.paymentMethod,
    merchantOrderId: opts.merchantOrderId,
    productDetails: opts.productDetails,
    email: opts.email,
    customerVaName: opts.customerVaName,
    phoneNumber: opts.phoneNumber ?? "08000000000",
    callbackUrl: opts.callbackUrl,
    returnUrl: opts.returnUrl,
    signature,
    expiryPeriod: opts.expiryPeriod ?? 1440, // default 24 jam (dalam menit)
  };

  const res = await fetch(`${opts.base}/api/merchant/v2/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Duitku inquiry failed: ${res.status} ${text}`);
  }

  const json = await res.json() as DuitkuInquiryResponse;
  return json;
}

export async function checkTransactionStatus(opts: {
  merchantCode: string;
  apiKey: string;
  merchantOrderId: string;
  base: string;
}): Promise<DuitkuCheckStatusResponse> {
  const signature = createCheckStatusSignature(
    opts.merchantCode,
    opts.merchantOrderId,
    opts.apiKey,
  );

  const res = await fetch(`${opts.base}/api/merchant/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantCode: opts.merchantCode,
      merchantOrderId: opts.merchantOrderId,
      signature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Duitku status check failed: ${res.status} ${text}`);
  }

  return await res.json() as DuitkuCheckStatusResponse;
}
