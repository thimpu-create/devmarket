// SERVER ONLY — never import this in a 'use client' file
// The razorpay npm package is a Node.js SDK, not for the browser
import Razorpay from 'razorpay'
import crypto from 'crypto'

// Function instead of module-level instance — so it's only created when called
// and only ever called from API routes (server-side)
export function getRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

// Verify payment signature from Razorpay
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string
  paymentId: string
  signature: string
}) {
  const body = orderId + '|' + paymentId
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')
  return expected === signature
}

// Format paise to ₹ string — safe to copy into client files directly
// e.g. formatINR(29900) → "₹299"
export function formatINR(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)
}