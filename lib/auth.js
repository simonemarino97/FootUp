import crypto from 'crypto'
import { cookies } from 'next/headers'
import { MongoClient } from 'mongodb'

const SECRET = process.env.AUTH_SECRET || 'footup-secret-change-me-in-prod-9x82hf9'

let _client, _db
export async function getDb() {
  if (!_client) {
    _client = new MongoClient(process.env.MONGO_URL)
    await _client.connect()
    _db = _client.db(process.env.DB_NAME || 'footup')
  }
  return _db
}

export function isPro(user) {
  if (!user) return false
  if (user.plan !== 'pro') return false
  if (!user.pro_until) return false
  return new Date(user.pro_until).getTime() > Date.now()
}

export function planStatus(user) {
  const pro = isPro(user)
  return {
    plan: pro ? 'pro' : 'free',
    pro_until: user?.pro_until || null,
    is_founder: !!user?.is_founder,
    is_admin: !!user?.is_admin,
    referral_code: user?.referral_code || null,
    referrals_count: user?.referrals_count || 0,
  }
}

function randCode(len = 6) {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)]
  return s
}
export { randCode }

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64').toString('utf8')
}

export function signToken(payload) {
  const body = b64url(JSON.stringify(payload))
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(body).digest())
  return `${body}.${sig}`
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(body).digest())
  if (expected !== sig) return null
  try { return JSON.parse(b64urlDecode(body)) } catch { return null }
}

export async function getSessionUser(request) {
  let token = null
  try {
    const cookieStore = await cookies()
    token = cookieStore.get('footup_token')?.value
  } catch {
    // fallback to request cookies
    token = request?.cookies?.get('footup_token')?.value
  }
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload?.userId) return null
  const db = await getDb()
  const user = await db.collection('users').findOne({ id: payload.userId })
  if (!user) return null
  const { password_hash, _id, ...safe } = user
  return safe
}

export function makeAuthCookie(token) {
  return `footup_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*30}`
}
