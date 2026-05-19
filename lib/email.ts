import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDownloadEmail({
  buyerEmail,
  buyerName,
  productName,
  sellerName,
  downloadUrl,
}: {
  buyerEmail: string
  buyerName: string
  productName: string
  sellerName: string
  downloadUrl: string
}) {
  await resend.emails.send({
    from: 'DevMarket <noreply@developerthimpu.online>',
    to: buyerEmail,
    subject: `Your download is ready: ${productName}`,
    html: `
      <div style="font-family: monospace; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e5e5e5;">
        <h1 style="font-size: 20px; color: #22c55e; margin-bottom: 8px;">✓ Payment successful</h1>
        <p style="color: #a1a1aa; margin-bottom: 32px;">Hey ${buyerName}, your purchase is ready.</p>

        <div style="background: #111; border: 1px solid #222; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a;">PRODUCT</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${productName}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #71717a;">by ${sellerName}</p>
        </div>

        <a href="${downloadUrl}"
           style="display: block; background: #22c55e; color: #000; text-align: center;
                  padding: 14px 24px; border-radius: 6px; text-decoration: none;
                  font-weight: bold; font-size: 15px; margin-bottom: 16px;">
          ↓ Download now
        </a>

        <p style="font-size: 12px; color: #52525b; text-align: center;">
          Link expires in 10 minutes. Download immediately.
        </p>

        <hr style="border-color: #222; margin: 32px 0;" />
        <p style="font-size: 12px; color: #3f3f46; text-align: center;">
          DevMarket — built for Indian developers
        </p>
      </div>
    `,
  })
}