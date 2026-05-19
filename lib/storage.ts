// Cloudflare R2 file storage utilities
// Uses native fetch + manual presigned URLs (no AWS SDK needed)

import crypto from 'crypto'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const BUCKET = process.env.R2_BUCKET_NAME!
const ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// AWS Signature V4 signing — R2 is S3-compatible so this works
function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function hex(buf: Buffer): string {
  return buf.toString('hex')
}

function getSigningKey(date: string): Buffer {
  const kDate = hmac('AWS4' + R2_SECRET_ACCESS_KEY, date)
  const kRegion = hmac(kDate, 'auto')
  const kService = hmac(kRegion, 's3')
  return hmac(kService, 'aws4_request')
}

// Generate a presigned URL for PUT (upload) or GET (download)
function presignUrl({
  method,
  key,
  contentType,
  expiresIn,
}: {
  method: 'PUT' | 'GET'
  key: string
  contentType?: string
  expiresIn: number // seconds
}): string {
  const now = new Date()
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const timestamp = now.toISOString().replace(/[:-]|\.\d+/g, '').slice(0, 15) + 'Z' // YYYYMMDDTHHmmssZ

  const credentialScope = `${datestamp}/auto/s3/aws4_request`
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }

  if (method === 'PUT' && contentType) {
    queryParams['X-Amz-SignedHeaders'] = 'content-type;host'
  }

  const sortedQuery = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&')

  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const canonicalHeaders = method === 'PUT' && contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`
  const signedHeaders = method === 'PUT' && contentType ? 'content-type;host' : 'host'

  const canonicalRequest = [
    method,
    `/${BUCKET}/${key}`,
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    hex(Buffer.from(crypto.createHash('sha256').update(canonicalRequest).digest())),
  ].join('\n')

  const signingKey = getSigningKey(datestamp)
  const signature = hex(hmac(signingKey, stringToSign))

  return `${ENDPOINT}/${BUCKET}/${key}?${sortedQuery}&X-Amz-Signature=${signature}`
}

// Generate a signed URL for uploading (1 hour)
export function getUploadUrl(key: string, contentType: string): string {
  return presignUrl({ method: 'PUT', key, contentType, expiresIn: 3600 })
}

// Generate a signed URL for downloading (10 minutes)
export function getDownloadUrl(key: string): string {
  return presignUrl({ method: 'GET', key, expiresIn: 600 })
}

// Generate a unique file storage key
export function generateFileKey(sellerId: string, fileName: string): string {
  const ext = fileName.split('.').pop()
  const random = crypto.randomBytes(8).toString('hex')
  return `products/${sellerId}/${random}.${ext}`
}
