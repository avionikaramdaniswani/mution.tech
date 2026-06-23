import crypto from "crypto";

const DOKU_BASE_URL = process.env.DOKU_ENV === "production"
  ? "https://api.doku.com"
  : "https://api-sandbox.doku.com";

export function getDokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("DOKU_CLIENT_ID and DOKU_SECRET_KEY environment variables are required");
  }
  return { clientId, secretKey };
}

export function buildDokuSignature(
  clientId: string,
  secretKey: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  body: object,
): string {
  const bodyStr = JSON.stringify(body);
  const digest =
    "SHA-256=" +
    crypto.createHash("sha256").update(bodyStr).digest("base64");

  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(component)
    .digest("base64");

  return `HMAC SHA256=${signature}`;
}

export function verifyDokuNotifySignature(
  secretKey: string,
  headers: {
    "client-id"?: string;
    "request-id"?: string;
    "request-timestamp"?: string;
    signature?: string;
  },
  body: object,
): boolean {
  const clientId = headers["client-id"] ?? "";
  const requestId = headers["request-id"] ?? "";
  const timestamp = headers["request-timestamp"] ?? "";
  const receivedSig = headers["signature"] ?? "";

  const bodyStr = JSON.stringify(body);
  const digest =
    "SHA-256=" +
    crypto.createHash("sha256").update(bodyStr).digest("base64");

  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:/billing/payment/notify`,
    `Digest:${digest}`,
  ].join("\n");

  const expected =
    "HMAC SHA256=" +
    crypto.createHmac("sha256", secretKey).update(component).digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expected),
  );
}

export interface CreatePaymentOptions {
  invoiceNumber: string;
  amount: number;
  user: { id: number; name: string; email: string };
  successUrl: string;
}

export interface DokuPaymentResult {
  paymentUrl: string;
  invoiceNumber: string;
}

export async function createDokuPayment(
  opts: CreatePaymentOptions,
): Promise<DokuPaymentResult> {
  const { clientId, secretKey } = getDokuConfig();
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const target = "/checkout/v1/payment";

  const body = {
    order: {
      invoice_number: opts.invoiceNumber,
      line_items: [
        {
          name: "Topup Kredit Mution",
          price: opts.amount,
          quantity: 1,
        },
      ],
      amount: opts.amount,
    },
    payment: {
      payment_due_date: 60,
    },
    customer: {
      id: String(opts.user.id),
      name: opts.user.name,
      email: opts.user.email,
    },
    additional_info: {
      success_url: opts.successUrl,
    },
  };

  const signature = buildDokuSignature(
    clientId,
    secretKey,
    requestId,
    timestamp,
    target,
    body,
  );

  const res = await fetch(`${DOKU_BASE_URL}${target}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DOKU API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    response: { payment: { url: string }; invoice_number: string };
  };

  return {
    paymentUrl: data.response.payment.url,
    invoiceNumber: data.response.invoice_number ?? opts.invoiceNumber,
  };
}
