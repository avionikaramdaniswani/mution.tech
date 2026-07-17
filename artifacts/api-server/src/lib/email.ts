import { logger } from "./logger";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@mution.tech";

function getApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — cannot send OTP email");
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;text-align:center;">
                  <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Mution</p>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">PaaS &amp; AI Gateway</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#172033;">Kode verifikasi kamu</p>
                  <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                    Masukkan kode di bawah ini untuk melanjutkan pendaftaran akun Mution. Kode berlaku selama <strong>10 menit</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#fff7ed;border:2px dashed #f97316;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                    <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#172033;font-variant-numeric:tabular-nums;">${otp}</span>
                  </div>
                  <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                    Jika kamu tidak merasa mendaftar di Mution, abaikan email ini. Kode ini tidak akan digunakan tanpa tindakanmu.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Mution · <a href="https://mution.tech" style="color:#f97316;text-decoration:none;">mution.tech</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `${otp} — kode verifikasi Mution kamu`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Resend API error");
      return false;
    }

    logger.info({ to }, "OTP email sent via Resend");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send OTP email");
    return false;
  }
}
