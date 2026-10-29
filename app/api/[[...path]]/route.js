import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getDb, hashPassword, verifyPassword, signToken, getSessionUser, makeAuthCookie, randCode } from '@/lib/auth'
import { calcNewRatings, getDivision, START_RATING, computeReputation, computeBadges } from '@/lib/elo'
import { getMembership, ensurePlayerRecord, publicUser, POSITIONS } from '@/lib/clubs'

const HEX = /^#[0-9a-fA-F]{6}$/
const KIT_PATTERNS = ['solid', 'stripes', 'hoops', 'halves', 'sash', 'pinstripes']
function sanitizeKitPart(k = {}) {
  return {
    shirt: HEX.test(k.shirt) ? k.shirt : '#10b981',
    sleeves: HEX.test(k.sleeves) ? k.sleeves : (HEX.test(k.shirt) ? k.shirt : '#10b981'),
    accent: HEX.test(k.accent) ? k.accent : '#ffffff',
    shorts: HEX.test(k.shorts) ? k.shorts : '#0b0f0d',
    socks: HEX.test(k.socks) ? k.socks : '#0b0f0d',
    pattern: KIT_PATTERNS.includes(k.pattern) ? k.pattern : 'solid',
  }
}
function userAccount(u) {
  return { is_founder: !!u?.is_founder, is_admin: !!u?.is_admin, referral_code: u?.referral_code || null, referrals_count: u?.referrals_count || 0 }
}

function corsResp(data, init = {}) {
  const res = NextResponse.json(data, init)
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}
function err(msg, status = 400) { return corsResp({ error: msg }, { status }) }
function clean(doc) { if (!doc) return doc; const { _id, password_hash, ...r } = doc; return r }

export async function OPTIONS() { return corsResp({}) }

async function handler(request, { params }) {
  const p = await params
  const parts = p.path || []
  const route = '/' + parts.join('/')
  const method = request.method

  try {
    const db = await getDb()

    // Helper: enrich team with captain info + member count
    const enrichTeamPlan = async (t) => {
      if (!t) return t
      const cap = await db.collection('users').findOne({ id: t.captain_id })
      const member_count = await db.collection('club_members').countDocuments({ club_id: t.id, status: 'active' })
      return { ...t, is_founder: !!cap?.is_founder, captain_name: cap?.name || null, member_count: Math.max(member_count, 1) }
    }
    const enrichTeamsPlan = async (list) => {
      const ids = [...new Set(list.map(t => t.captain_id))]
      const caps = await db.collection('users').find({ id: { $in: ids } }).toArray()
      const map = Object.fromEntries(caps.map(u => [u.id, u]))
      const counts = await db.collection('club_members').aggregate([
        { $match: { club_id: { $in: list.map(t => t.id) }, status: 'active' } },
        { $group: { _id: '$club_id', n: { $sum: 1 } } },
      ]).toArray()
      const cmap = Object.fromEntries(counts.map(c => [c._id, c.n]))
      return list.map(t => ({ ...t, is_founder: !!map[t.captain_id]?.is_founder, captain_name: map[t.captain_id]?.name || null, member_count: Math.max(cmap[t.id] || 0, 1) }))
    }
    // Helper: session user + active club membership
    const getCtx = async () => {
      const user = await getSessionUser(request)
      if (!user) return { user: null, membership: null, team: null }
      const { membership, team } = await getMembership(db, user.id)
      return { user, membership, team, isCaptain: membership?.role === 'captain' }
    }

    // ============ AUTH ============
    if (route === '/auth/register' && method === 'POST') {
      const { email, password, name, referral } = await request.json()
      if (!email || !password) return err('email & password required')
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return err('Email already registered', 409)
      // Founder Team: first 100 users
      const userCount = await db.collection('users').countDocuments()
      let referral_code = randCode(6)
      // ensure unique
      while (await db.collection('users').findOne({ referral_code })) referral_code = randCode(6)
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password_hash: hashPassword(password),
        avatar_url: null,
        role: 'player',
        bio: '', position: null, preferred_foot: null, jersey_number: null, city: '', birth_year: null,
        is_founder: userCount < 100,
        is_admin: userCount === 0, // first user becomes admin
        referral_code,
        referred_by: null,
        referrals_count: 0,
        created_at: new Date(),
      }
      // handle referral (community invite counter only)
      if (referral) {
        const inviter = await db.collection('users').findOne({ referral_code: referral.toUpperCase() })
        if (inviter) {
          user.referred_by = inviter.id
          await db.collection('users').updateOne({ id: inviter.id }, { $inc: { referrals_count: 1 } })
        }
      }
      await db.collection('users').insertOne(user)
      const token = signToken({ userId: user.id })
      const res = corsResp({ user: clean(user) })
      res.headers.append('Set-Cookie', makeAuthCookie(token))
      return res
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      const user = await db.collection('users').findOne({ email: (email || '').toLowerCase() })
      if (!user || !verifyPassword(password, user.password_hash)) return err('Invalid credentials', 401)
      const token = signToken({ userId: user.id })
      const res = corsResp({ user: clean(user) })
      res.headers.append('Set-Cookie', makeAuthCookie(token))
      return res
    }

    if (route === '/auth/logout' && method === 'POST') {
      const res = corsResp({ ok: true })
      res.headers.append('Set-Cookie', 'footup_token=; Path=/; Max-Age=0')
      return res
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getSessionUser(request)
      if (!user) return corsResp({ user: null })
      const { membership, team } = await getMembership(db, user.id)
      const role = membership?.role || 'free_agent'
      let pending_requests_count = 0
      if (role === 'captain' && team) pending_requests_count = await db.collection('join_requests').countDocuments({ club_id: team.id, status: 'pending' })
      const my_requests = await db.collection('join_requests').find({ user_id: user.id, status: 'pending' }).sort({ created_at: -1 }).toArray()
      return corsResp({
        user: { ...user, ...userAccount(user), club_role: role },
        team: team ? { ...clean(team), is_founder: !!user.is_founder } : null,
        membership: membership ? clean(membership) : null,
        role,
        pending_requests_count,
        my_requests: my_requests.map(clean),
      })
    }

    // ============ MY PLAYER PROFILE ============
    if (route === '/me/profile' && method === 'PUT') {
      const { user, membership, team } = await getCtx()
      if (!user) return err('unauthorized', 401)
      const body = await request.json()
      const upd = {}
      if (typeof body.name === 'string' && body.name.trim()) upd.name = body.name.trim().slice(0, 60)
      if (body.avatar_url !== undefined) upd.avatar_url = body.avatar_url || null
      if (typeof body.bio === 'string') upd.bio = body.bio.slice(0, 280)
      if (body.position !== undefined) upd.position = POSITIONS.includes(body.position) ? body.position : null
      if (body.preferred_foot !== undefined) upd.preferred_foot = ['right', 'left', 'both'].includes(body.preferred_foot) ? body.preferred_foot : null
      if (body.jersey_number !== undefined) {
        const n = parseInt(body.jersey_number)
        upd.jersey_number = Number.isFinite(n) && n >= 1 && n <= 99 ? n : null
      }
      if (typeof body.city === 'string') upd.city = body.city.slice(0, 60)
      if (body.birth_year !== undefined) {
        const y = parseInt(body.birth_year)
        upd.birth_year = Number.isFinite(y) && y > 1930 && y <= new Date().getFullYear() ? y : null
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: upd })
      // keep linked roster entry in sync
      if (membership && team) {
        const pu = {}
        if (upd.name) { const [f, ...r] = upd.name.split(' '); pu.first_name = f; pu.last_name = r.join(' ') }
        if ('position' in upd && upd.position) pu.position = upd.position
        if ('jersey_number' in upd) pu.shirt_number = upd.jersey_number
        if ('avatar_url' in upd) pu.photo_url = upd.avatar_url
        if ('preferred_foot' in upd && upd.preferred_foot) pu.foot = upd.preferred_foot
        if (Object.keys(pu).length) await db.collection('players').updateOne({ user_id: user.id, team_id: team.id }, { $set: pu })
        const mu = {}
        if ('position' in upd) mu.position = upd.position
        if ('jersey_number' in upd) mu.jersey_number = upd.jersey_number
        if (Object.keys(mu).length) await db.collection('club_members').updateOne({ id: membership.id }, { $set: mu })
      }
      const fresh = await db.collection('users').findOne({ id: user.id })
      return corsResp({ user: publicUser(fresh) })
    }

    if (route === '/me/join-requests' && method === 'GET') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const list = await db.collection('join_requests').find({ user_id: user.id }).sort({ created_at: -1 }).limit(50).toArray()
      return corsResp({ requests: list.map(clean) })
    }

    // ============ PUBLIC PLAYER PROFILE ============
    if (parts[0] === 'players' && parts[1] && !parts[2] && method === 'GET') {
      const u = await db.collection('users').findOne({ id: parts[1] })
      if (!u) return err('player not found', 404)
      const { membership, team } = await getMembership(db, u.id)
      let club = null, stats = { matches: 0, goals: 0, assists: 0, mvps: 0, yellows: 0, reds: 0 }
      if (team) {
        club = {
          id: team.id, name: team.name, logo_url: team.logo_url || null, city: team.city || '',
          primary_color: team.primary_color, secondary_color: team.secondary_color,
          rating: team.rating, division: getDivision(team.rating), reputation: computeReputation(team),
          role: membership.role, jersey_number: membership.jersey_number ?? u.jersey_number ?? null,
          joined_at: membership.joined_at, kit: team.kit || null,
        }
      }
      const records = await db.collection('players').find({ user_id: u.id }).toArray()
      for (const r of records) for (const k of Object.keys(stats)) stats[k] += r[k] || 0
      return corsResp({
        player: { ...publicUser(u), status: team ? 'club_member' : 'free_agent', club_role: membership?.role || 'free_agent' },
        club, stats,
      })
    }

    // ============ DISCOVER ============
    if (route === '/discover/players' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || ''
      const position = url.searchParams.get('position') || ''
      const status = url.searchParams.get('status') || 'all' // all | free_agent | club_member
      const filter = {}
      if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { city: { $regex: q, $options: 'i' } }]
      if (position && POSITIONS.includes(position)) filter.position = position
      const users = await db.collection('users').find(filter).sort({ created_at: -1 }).limit(150).toArray()
      const mems = await db.collection('club_members').find({ user_id: { $in: users.map(u => u.id) }, status: 'active' }).toArray()
      const legacyTeams = await db.collection('teams').find({ captain_id: { $in: users.map(u => u.id) } }).toArray()
      const memMap = Object.fromEntries(mems.map(m => [m.user_id, m]))
      for (const t of legacyTeams) if (!memMap[t.captain_id]) memMap[t.captain_id] = { club_id: t.id, role: 'captain' }
      const clubIds = [...new Set(Object.values(memMap).map(m => m.club_id))]
      const clubs = await db.collection('teams').find({ id: { $in: clubIds } }).toArray()
      const cmap = Object.fromEntries(clubs.map(c => [c.id, c]))
      let list = users.map(u => {
        const m = memMap[u.id]
        const c = m ? cmap[m.club_id] : null
        return {
          ...publicUser(u),
          status: c ? 'club_member' : 'free_agent',
          club_role: c ? m.role : 'free_agent',
          club: c ? { id: c.id, name: c.name, logo_url: c.logo_url || null, primary_color: c.primary_color } : null,
        }
      })
      if (status !== 'all') list = list.filter(p => p.status === status)
      return corsResp({ players: list.slice(0, 100) })
    }

    // ============ JOIN REQUEST ACTIONS ============
    if (parts[0] === 'join-requests' && parts[1] && ['accept', 'reject', 'cancel'].includes(parts[2]) && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const jr = await db.collection('join_requests').findOne({ id: parts[1] })
      if (!jr) return err('request not found', 404)
      if (jr.status !== 'pending') return err('request already ' + jr.status, 400)
      if (parts[2] === 'cancel') {
        if (jr.user_id !== user.id) return err('forbidden', 403)
        await db.collection('join_requests').updateOne({ id: jr.id }, { $set: { status: 'cancelled', decided_at: new Date() } })
        return corsResp({ ok: true, status: 'cancelled' })
      }
      // accept / reject: only captain of that club
      const { membership } = await getMembership(db, user.id)
      if (!membership || membership.club_id !== jr.club_id || membership.role !== 'captain') return err('only the club captain can do this', 403)
      if (parts[2] === 'reject') {
        await db.collection('join_requests').updateOne({ id: jr.id }, { $set: { status: 'rejected', decided_at: new Date(), decided_by: user.id } })
        return corsResp({ ok: true, status: 'rejected' })
      }
      // accept
      const applicant = await db.collection('users').findOne({ id: jr.user_id })
      if (!applicant) return err('applicant no longer exists', 404)
      const { membership: other } = await getMembership(db, applicant.id)
      if (other) {
        await db.collection('join_requests').updateOne({ id: jr.id }, { $set: { status: 'cancelled', decided_at: new Date(), reason: 'already_in_club' } })
        return err('player already belongs to a club', 409)
      }
      const jersey = jr.jersey_number ?? applicant.jersey_number ?? null
      const position = jr.position || applicant.position || 'MID'
      const mem = { id: uuidv4(), user_id: applicant.id, club_id: jr.club_id, role: 'player', jersey_number: jersey, position, status: 'active', joined_at: new Date() }
      await db.collection('club_members').insertOne(mem)
      await ensurePlayerRecord(db, applicant, jr.club_id, { jersey_number: jersey, position })
      await db.collection('join_requests').updateOne({ id: jr.id }, { $set: { status: 'accepted', decided_at: new Date(), decided_by: user.id } })
      await db.collection('join_requests').updateMany({ user_id: applicant.id, status: 'pending', id: { $ne: jr.id } }, { $set: { status: 'cancelled', decided_at: new Date(), reason: 'joined_other_club' } })
      return corsResp({ ok: true, status: 'accepted', membership: clean(mem) })
    }

    // ============ LEAVE CLUB ============
    if (route === '/me/leave-club' && method === 'POST') {
      const { user, membership, team } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!membership) return err('you are not in a club', 400)
      if (membership.role === 'captain') {
        const others = await db.collection('club_members').countDocuments({ club_id: team.id, status: 'active', user_id: { $ne: user.id } })
        if (others > 0) return err('transfer captaincy before leaving the club', 400)
        return err('you are the only member: captains cannot leave their own club', 400)
      }
      await db.collection('club_members').updateOne({ id: membership.id }, { $set: { status: 'left', left_at: new Date() } })
      await db.collection('players').updateOne({ user_id: user.id, team_id: team.id }, { $set: { team_id: null, former_team_id: team.id, left_at: new Date() } })
      return corsResp({ ok: true })
    }

    // ============ GOOGLE OAUTH ============
    const GOOGLE_REDIRECT = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`

    if (route === '/auth/google/start' && method === 'GET') {
      if (!process.env.GOOGLE_CLIENT_ID) return err('Google OAuth not configured', 500)
      const url = new URL(request.url)
      const referral = url.searchParams.get('ref') || ''
      const state = crypto.randomBytes(16).toString('hex') + (referral ? '|' + referral : '')
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
        state,
      })
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      const res = NextResponse.redirect(authUrl)
      res.headers.append('Set-Cookie', `footup_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
      return res
    }

    if (route === '/auth/google/callback' && method === 'GET') {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const savedState = request.cookies.get('footup_oauth_state')?.value
      if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth_error=missing_code`)
      if (!state || !savedState || state !== savedState) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth_error=state_mismatch`)
      }
      try {
        // Exchange code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_REDIRECT,
            grant_type: 'authorization_code',
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) {
          console.error('Google token error', tokenData)
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth_error=token_exchange`)
        }
        // Get userinfo
        const uiRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        const gu = await uiRes.json()
        if (!uiRes.ok || !gu.email) {
          console.error('Google userinfo error', gu)
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth_error=userinfo`)
        }
        // Upsert user
        const email = gu.email.toLowerCase()
        let user = await db.collection('users').findOne({ email })
        const referral = state.includes('|') ? state.split('|')[1] : null
        if (!user) {
          const userCount = await db.collection('users').countDocuments()
          let referral_code = randCode(6)
          while (await db.collection('users').findOne({ referral_code })) referral_code = randCode(6)
          user = {
            id: uuidv4(),
            email,
            name: gu.name || gu.given_name || email.split('@')[0],
            password_hash: null,
            google_id: gu.sub,
            avatar_url: gu.picture || null,
            role: 'player',
            bio: '', position: null, preferred_foot: null, jersey_number: null, city: '', birth_year: null,
            is_founder: userCount < 100,
            is_admin: userCount === 0,
            referral_code,
            referred_by: null,
            referrals_count: 0,
            created_at: new Date(),
          }
          if (referral) {
            const inviter = await db.collection('users').findOne({ referral_code: referral.toUpperCase() })
            if (inviter) {
              user.referred_by = inviter.id
              await db.collection('users').updateOne({ id: inviter.id }, { $inc: { referrals_count: 1 } })
            }
          }
          await db.collection('users').insertOne(user)
        } else {
          // Link Google + refresh avatar if empty
          const upd = { $set: {} }
          if (!user.google_id) upd.$set.google_id = gu.sub
          if (!user.avatar_url && gu.picture) upd.$set.avatar_url = gu.picture
          if (Object.keys(upd.$set).length) await db.collection('users').updateOne({ id: user.id }, upd)
        }
        const token = signToken({ userId: user.id })
        const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth=success`)
        res.headers.append('Set-Cookie', makeAuthCookie(token))
        res.headers.append('Set-Cookie', 'footup_oauth_state=; Path=/; Max-Age=0')
        return res
      } catch (e) {
        console.error('OAuth callback error', e)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?oauth_error=exception`)
      }
    }

    // ============ TEAMS ============
    if (route === '/teams' && method === 'POST') {
      const { user, membership } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (membership) return err('You already belong to a club', 409)
      const body = await request.json()
      if (!body.name || !String(body.name).trim()) return err('club name required')
      const team = {
        id: uuidv4(),
        captain_id: user.id,
        name: String(body.name).trim(),
        recruiting: body.recruiting !== false,
        kit: null,
        logo_url: body.logo_url || null,
        cover_url: body.cover_url || null,
        founded_year: body.founded_year || new Date().getFullYear(),
        description: body.description || '',
        primary_color: body.primary_color || '#10b981',
        secondary_color: body.secondary_color || '#0ea5e9',
        facility: body.facility || '',
        city: body.city || '',
        province: body.province || '',
        football_type: body.football_type || 'both', // 5, 7, both
        rating: START_RATING,
        wins: 0, draws: 0, losses: 0,
        goals_for: 0, goals_against: 0,
        streak: 0, best_streak: 0,
        matches_played: 0,
        followers: [],
        achievements: [],
        last_matches: [],
        created_at: new Date(),
      }
      await db.collection('teams').insertOne(team)
      await db.collection('club_members').insertOne({
        id: uuidv4(), user_id: user.id, club_id: team.id, role: 'captain',
        jersey_number: user.jersey_number ?? null, position: user.position || null, status: 'active', joined_at: new Date(),
      })
      await ensurePlayerRecord(db, user, team.id, { is_captain: true })
      await db.collection('join_requests').updateMany({ user_id: user.id, status: 'pending' }, { $set: { status: 'cancelled', decided_at: new Date(), reason: 'created_club' } })
      return corsResp({ team: clean(team) })
    }

    if (route === '/teams' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || ''
      const recruiting = url.searchParams.get('recruiting')
      const filter = q ? { $or: [
        { name: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ]} : {}
      if (recruiting === '1') filter.recruiting = { $ne: false }
      const teams = await db.collection('teams').find(filter).limit(100).toArray()
      const enriched = await enrichTeamsPlan(teams.map(clean))
      enriched.sort((a, b) => b.rating - a.rating)
      return corsResp({ teams: enriched.map(t => ({ ...t, recruiting: t.recruiting !== false, division: getDivision(t.rating), reputation: computeReputation(t) })) })
    }

    // /teams/:id ; /teams/:id/players ; /teams/:id/follow
    if (parts[0] === 'teams' && parts[1]) {
      const teamId = parts[1]
      const team = await db.collection('teams').findOne({ id: teamId })
      if (!team) return err('team not found', 404)

      if (!parts[2] && method === 'GET') {
        const players = await db.collection('players').find({ team_id: teamId }).toArray()
        const posts = await db.collection('posts').find({ team_id: teamId }).sort({ created_at: -1 }).limit(20).toArray()
        const enrichedTeam = await enrichTeamPlan(team)
        const reputation = computeReputation(team)
        const badges = computeBadges(team)
        const divisionEvents = await db.collection('division_events').find({ team_id: teamId }).sort({ at: -1 }).limit(5).toArray()
        // members (registered users in the club)
        const mems = await db.collection('club_members').find({ club_id: teamId, status: 'active' }).toArray()
        const memUsers = await db.collection('users').find({ id: { $in: mems.map(m => m.user_id) } }).toArray()
        const umap = Object.fromEntries(memUsers.map(u => [u.id, u]))
        const members = mems.map(m => ({ ...publicUser(umap[m.user_id]), role: m.role, jersey_number: m.jersey_number ?? umap[m.user_id]?.jersey_number ?? null, position: m.position || umap[m.user_id]?.position || null, joined_at: m.joined_at }))
          .filter(m => m.id).sort((a, b) => (b.role === 'captain') - (a.role === 'captain'))
        // viewer context
        const viewer = await getSessionUser(request)
        let my_role = null, my_pending_request = null
        if (viewer) {
          const { membership: vm } = await getMembership(db, viewer.id)
          if (vm?.club_id === teamId) my_role = vm.role
          else if (!vm) my_role = 'free_agent'
          else my_role = 'other_club'
          const pr = await db.collection('join_requests').findOne({ user_id: viewer.id, club_id: teamId, status: 'pending' })
          if (pr) my_pending_request = clean(pr)
        }
        // extra derived stats
        const gd = (team.goals_for || 0) - (team.goals_against || 0)
        const avg_gf = team.matches_played ? +(team.goals_for / team.matches_played).toFixed(2) : 0
        const avg_ga = team.matches_played ? +(team.goals_against / team.matches_played).toFixed(2) : 0
        return corsResp({
          team: {
            ...clean(enrichedTeam),
            division: getDivision(team.rating),
            reputation, badges,
            goal_difference: gd, avg_goals_for: avg_gf, avg_goals_against: avg_ga,
            clean_sheets: team.clean_sheets || 0,
            largest_victory: team.largest_victory || 0,
            largest_defeat: team.largest_defeat || 0,
            tournament_wins: team.tournament_wins || 0,
            total_yellows: team.total_yellows || 0,
            total_reds: team.total_reds || 0,
            division_events: divisionEvents.map(clean),
            recruiting: team.recruiting !== false,
            kit: team.kit || null,
          },
          players: players.map(clean),
          posts: posts.map(clean),
          members,
          my_role,
          my_pending_request,
        })
      }

      if (parts[2] === 'history' && method === 'GET') {
        const matches = await db.collection('matches').find({
          $or: [{ home_team_id: teamId }, { away_team_id: teamId }],
          status: 'confirmed'
        }).sort({ created_at: -1 }).limit(200).toArray()
        // Map with ELO delta from team.last_matches when available
        const lastMap = Object.fromEntries((team.last_matches || []).filter(m => m.match_id).map(m => [m.match_id, m]))
        const list = matches.map(m => {
          const isHome = m.home_team_id === teamId
          const c = m.confirmations?.[m.home_team_id]
          const sh = c?.score_home, sa = c?.score_away
          const scoreLine = isHome ? `${sh}-${sa}` : `${sa}-${sh}`
          const result = sh === sa ? 'D' : (isHome ? (sh > sa ? 'W' : 'L') : (sa > sh ? 'W' : 'L'))
          const opponent = isHome ? m.away_team_name : m.home_team_name
          const opponent_id = isHome ? m.away_team_id : m.home_team_id
          const info = lastMap[m.id] || {}
          return {
            match_id: m.id, opponent, opponent_id, score: scoreLine, result,
            competition: m.importance > 1 ? 'Tournament' : 'League',
            venue: m.facility || m.city,
            date: m.date || m.created_at,
            delta: info.delta ?? null,
            season: info.season || null,
          }
        })
        return corsResp({ matches: list })
      }

      if (parts[2] === 'badges' && method === 'GET') {
        return corsResp({ badges: computeBadges(team) })
      }

      if (!parts[2] && method === 'PUT') {
        const { user, membership } = await getCtx()
        if (!user || membership?.club_id !== teamId || membership.role !== 'captain') return err('only the club captain can edit the club', 403)
        const body = await request.json()
        const allowed = ['name','logo_url','cover_url','founded_year','description','primary_color','secondary_color','facility','city','province','football_type','recruiting']
        const upd = {}
        for (const k of allowed) if (body[k] !== undefined) upd[k] = body[k]
        if (body.kit !== undefined) {
          const k = body.kit || {}
          upd.kit = {
            home: sanitizeKitPart(k.home),
            away: sanitizeKitPart(k.away),
            legea_collection: typeof k.legea_collection === 'string' ? k.legea_collection.slice(0, 60) : '103 Color',
            notes: typeof k.notes === 'string' ? k.notes.slice(0, 280) : '',
            updated_at: new Date(),
          }
        }
        if (upd.name !== undefined && !String(upd.name).trim()) return err('club name required')
        await db.collection('teams').updateOne({ id: teamId }, { $set: upd })
        const updated = await db.collection('teams').findOne({ id: teamId })
        return corsResp({ team: { ...clean(updated), division: getDivision(updated.rating) } })
      }

      if (parts[2] === 'players' && method === 'POST') {
        const { user, membership } = await getCtx()
        if (!user || membership?.club_id !== teamId || membership.role !== 'captain') return err('only the club captain can manage the roster', 403)
        const body = await request.json()
        const player = {
          id: uuidv4(),
          team_id: teamId,
          first_name: body.first_name || '',
          last_name: body.last_name || '',
          shirt_number: body.shirt_number || null,
          position: body.position || 'MID',
          foot: body.foot || 'right',
          birth_year: body.birth_year || null,
          photo_url: body.photo_url || null,
          is_captain: !!body.is_captain,
          matches: 0, goals: 0, assists: 0, yellows: 0, reds: 0, mvps: 0,
          created_at: new Date(),
        }
        await db.collection('players').insertOne(player)
        return corsResp({ player: clean(player) })
      }

      if (parts[2] === 'follow' && method === 'POST') {
        const user = await getSessionUser(request)
        if (!user) return err('unauthorized', 401)
        const isFollowing = (team.followers || []).includes(user.id)
        await db.collection('teams').updateOne({ id: teamId },
          isFollowing ? { $pull: { followers: user.id } } : { $addToSet: { followers: user.id } })
        return corsResp({ following: !isFollowing })
      }

      // ---- Join requests ----
      if (parts[2] === 'join-request' && method === 'POST') {
        const { user, membership } = await getCtx()
        if (!user) return err('unauthorized', 401)
        if (membership) return err(membership.club_id === teamId ? 'you are already in this club' : 'you already belong to a club (one club per player)', 409)
        if (team.recruiting === false) return err('this club is not accepting requests right now', 400)
        const dup = await db.collection('join_requests').findOne({ user_id: user.id, club_id: teamId, status: 'pending' })
        if (dup) return err('request already pending', 409)
        const body = await request.json().catch(() => ({}))
        const n = parseInt(body.jersey_number)
        const jr = {
          id: uuidv4(), user_id: user.id, user_name: user.name, user_avatar: user.avatar_url || null,
          club_id: teamId, club_name: team.name, club_logo: team.logo_url || null,
          message: typeof body.message === 'string' ? body.message.slice(0, 280) : '',
          position: POSITIONS.includes(body.position) ? body.position : (user.position || null),
          jersey_number: Number.isFinite(n) && n >= 1 && n <= 99 ? n : (user.jersey_number ?? null),
          status: 'pending', created_at: new Date(),
        }
        await db.collection('join_requests').insertOne(jr)
        return corsResp({ request: clean(jr) })
      }

      if (parts[2] === 'join-requests' && method === 'GET') {
        const { user, membership } = await getCtx()
        if (!user || membership?.club_id !== teamId || membership.role !== 'captain') return err('only the club captain can view requests', 403)
        const list = await db.collection('join_requests').find({ club_id: teamId, status: 'pending' }).sort({ created_at: -1 }).toArray()
        const us = await db.collection('users').find({ id: { $in: list.map(r => r.user_id) } }).toArray()
        const um = Object.fromEntries(us.map(u => [u.id, publicUser(u)]))
        return corsResp({ requests: list.map(r => ({ ...clean(r), user: um[r.user_id] || null })) })
      }

      if (parts[2] === 'members' && method === 'GET') {
        const mems = await db.collection('club_members').find({ club_id: teamId, status: 'active' }).toArray()
        const us = await db.collection('users').find({ id: { $in: mems.map(m => m.user_id) } }).toArray()
        const um = Object.fromEntries(us.map(u => [u.id, u]))
        return corsResp({ members: mems.filter(m => um[m.user_id]).map(m => ({ ...publicUser(um[m.user_id]), role: m.role, jersey_number: m.jersey_number, position: m.position, joined_at: m.joined_at })) })
      }

      if (parts[2] === 'members' && parts[3] && method === 'DELETE') {
        const { user, membership } = await getCtx()
        if (!user || membership?.club_id !== teamId || membership.role !== 'captain') return err('only the club captain can remove members', 403)
        if (parts[3] === user.id) return err('captain cannot remove themselves', 400)
        const target = await db.collection('club_members').findOne({ club_id: teamId, user_id: parts[3], status: 'active' })
        if (!target) return err('member not found', 404)
        await db.collection('club_members').updateOne({ id: target.id }, { $set: { status: 'removed', left_at: new Date() } })
        await db.collection('players').updateOne({ user_id: parts[3], team_id: teamId }, { $set: { team_id: null, former_team_id: teamId, left_at: new Date() } })
        return corsResp({ ok: true })
      }

      if (parts[2] === 'transfer-captain' && method === 'POST') {
        const { user, membership } = await getCtx()
        if (!user || membership?.club_id !== teamId || membership.role !== 'captain') return err('only the club captain can transfer captaincy', 403)
        const { user_id } = await request.json()
        const target = await db.collection('club_members').findOne({ club_id: teamId, user_id, status: 'active' })
        if (!target || user_id === user.id) return err('target must be another club member', 400)
        await db.collection('club_members').updateOne({ id: target.id }, { $set: { role: 'captain' } })
        await db.collection('club_members').updateOne({ id: membership.id }, { $set: { role: 'player' } })
        await db.collection('teams').updateOne({ id: teamId }, { $set: { captain_id: user_id } })
        await db.collection('players').updateOne({ user_id, team_id: teamId }, { $set: { is_captain: true } })
        await db.collection('players').updateOne({ user_id: user.id, team_id: teamId }, { $set: { is_captain: false } })
        return corsResp({ ok: true })
      }
    }

    // ============ POSTS / FEED ============
    if (route === '/posts' && method === 'POST') {
      const { user, team } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!team) return err('join or create a club first', 400)
      const body = await request.json()
      const post = {
        id: uuidv4(),
        team_id: team.id,
        team_name: team.name,
        team_logo: team.logo_url,
        author_id: user.id,
        author_name: user.name,
        content: body.content || '',
        media_url: body.media_url || null,
        media_type: body.media_type || null,
        kind: body.kind || 'update', // update|result|announcement|celebration|new_player
        likes: [],
        comments: [],
        created_at: new Date(),
      }
      await db.collection('posts').insertOne(post)
      return corsResp({ post: clean(post) })
    }

    if (route === '/feed' && method === 'GET') {
      const posts = await db.collection('posts').find({}).sort({ created_at: -1 }).limit(50).toArray()
      return corsResp({ posts: posts.map(clean) })
    }

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'like' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const post = await db.collection('posts').findOne({ id: parts[1] })
      if (!post) return err('not found', 404)
      const liked = (post.likes || []).includes(user.id)
      await db.collection('posts').updateOne({ id: parts[1] },
        liked ? { $pull: { likes: user.id } } : { $addToSet: { likes: user.id } })
      return corsResp({ liked: !liked, count: liked ? (post.likes.length - 1) : (post.likes.length + 1) })
    }

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'comment' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const body = await request.json()
      const comment = { id: uuidv4(), user_id: user.id, user_name: user.name, text: body.text, created_at: new Date() }
      await db.collection('posts').updateOne({ id: parts[1] }, { $push: { comments: comment } })
      return corsResp({ comment })
    }

    // ============ CHALLENGES ============
    if (route === '/challenges' && method === 'POST') {
      const { user, team, isCaptain } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!team) return err('create a team first', 400)
      if (!isCaptain) return err('only the club captain can publish challenges', 403)
      const body = await request.json()
      const ch = {
        id: uuidv4(),
        team_id: team.id,
        team_name: team.name,
        team_logo: team.logo_url,
        team_rating: team.rating,
        football_type: body.football_type || 'both',
        date: body.date || '',
        time: body.time || '',
        city: body.city || team.city,
        facility: body.facility || '',
        skill_level: body.skill_level || 'any',
        notes: body.notes || '',
        status: 'open',
        accepted_by_team_id: null,
        created_at: new Date(),
      }
      await db.collection('challenges').insertOne(ch)
      return corsResp({ challenge: clean(ch) })
    }

    if (route === '/challenges' && method === 'GET') {
      const chs = await db.collection('challenges').find({}).sort({ created_at: -1 }).limit(100).toArray()
      return corsResp({ challenges: chs.map(clean) })
    }

    if (parts[0] === 'challenges' && parts[1] && parts[2] === 'accept' && method === 'POST') {
      const { user, team: myTeam, isCaptain } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!myTeam) return err('create a team first', 400)
      if (!isCaptain) return err('only the club captain can accept challenges', 403)
      const ch = await db.collection('challenges').findOne({ id: parts[1] })
      if (!ch) return err('not found', 404)
      if (ch.team_id === myTeam.id) return err('cannot accept own challenge', 400)
      if (ch.status !== 'open') return err('already accepted', 400)
      await db.collection('challenges').updateOne({ id: parts[1] }, { $set: {
        status: 'accepted', accepted_by_team_id: myTeam.id, accepted_by_team_name: myTeam.name
      }})
      // create match
      const match = {
        id: uuidv4(),
        challenge_id: ch.id,
        home_team_id: ch.team_id,
        home_team_name: ch.team_name,
        away_team_id: myTeam.id,
        away_team_name: myTeam.name,
        date: ch.date, time: ch.time, facility: ch.facility, city: ch.city,
        status: 'scheduled', // scheduled -> pending -> confirmed / disputed
        confirmations: {}, // teamId -> { score_home, score_away, mvp }
        created_at: new Date(),
      }
      await db.collection('matches').insertOne(match)
      return corsResp({ match: clean(match) })
    }

    // ============ MATCHES ============
    if (route === '/matches' && method === 'GET') {
      const { user, team } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!team) return corsResp({ matches: [] })
      const matches = await db.collection('matches').find({
        $or: [{ home_team_id: team.id }, { away_team_id: team.id }]
      }).sort({ created_at: -1 }).limit(50).toArray()
      return corsResp({ matches: matches.map(clean) })
    }

    if (parts[0] === 'matches' && parts[1] && parts[2] === 'confirm' && method === 'POST') {
      const { user, team: myTeam, isCaptain } = await getCtx()
      if (!user) return err('unauthorized', 401)
      if (!myTeam) return err('no team', 400)
      if (!isCaptain) return err('only the club captain can confirm results', 403)
      const match = await db.collection('matches').findOne({ id: parts[1] })
      if (!match) return err('not found', 404)
      if (![match.home_team_id, match.away_team_id].includes(myTeam.id)) return err('not part of this match', 403)
      const body = await request.json()
      const conf = {
        score_home: parseInt(body.score_home),
        score_away: parseInt(body.score_away),
        mvp: body.mvp || null,
        goals: body.goals || [],
        assists: body.assists || [],
        yellows: body.yellows || [],
        reds: body.reds || [],
        by_team: myTeam.id,
        at: new Date(),
      }
      const confs = { ...(match.confirmations || {}), [myTeam.id]: conf }
      const homeC = confs[match.home_team_id]
      const awayC = confs[match.away_team_id]

      // Both confirmed and match scores? -> finalize
      let status = 'pending'
      if (homeC && awayC) {
        if (homeC.score_home === awayC.score_home && homeC.score_away === awayC.score_away) {
          status = 'confirmed'
        } else {
          status = 'disputed'
        }
      }

      await db.collection('matches').updateOne({ id: match.id }, { $set: { confirmations: confs, status } })

      if (status === 'confirmed') {
        await finalizeMatch(db, { ...match, confirmations: confs })
      }

      const updated = await db.collection('matches').findOne({ id: match.id })
      return corsResp({ match: clean(updated) })
    }

    // ============ LEADERBOARD ============
    if (route === '/leaderboard/teams' && method === 'GET') {
      const url = new URL(request.url)
      const ft = url.searchParams.get('football_type')
      const city = url.searchParams.get('city')
      const div = url.searchParams.get('division')
      const filter = {}
      if (ft && ft !== 'all') filter.football_type = { $in: ft === 'both' ? ['5','7','both'] : [ft, 'both'] }
      if (city) filter.city = { $regex: `^${city}$`, $options: 'i' }
      const teams = await db.collection('teams').find(filter).sort({ rating: -1 }).limit(200).toArray()
      let enriched = await enrichTeamsPlan(teams.map(clean))
      enriched = enriched.map(t => ({ ...t, division: getDivision(t.rating), reputation: computeReputation(t) }))
      if (div && div !== 'all') enriched = enriched.filter(t => t.division.division === parseInt(div))
      return corsResp({ teams: enriched.slice(0, 100) })
    }

    if (route === '/leaderboard/defense' && method === 'GET') {
      const teams = await db.collection('teams').find({ matches_played: { $gt: 0 } }).toArray()
      const enriched = teams.map(t => ({
        ...clean(t),
        division: getDivision(t.rating),
        avg_ga: t.goals_against / t.matches_played,
      })).sort((a, b) => a.avg_ga - b.avg_ga).slice(0, 50)
      return corsResp({ teams: enriched })
    }

    if (route === '/leaderboard/fairplay' && method === 'GET') {
      const teams = await db.collection('teams').find({ matches_played: { $gt: 0 } }).toArray()
      const enriched = teams.map(t => ({
        ...clean(t),
        division: getDivision(t.rating),
        cards_per_match: ((t.total_yellows || 0) + (t.total_reds || 0) * 2) / t.matches_played,
        total_yellows: t.total_yellows || 0,
        total_reds: t.total_reds || 0,
      })).sort((a, b) => a.cards_per_match - b.cards_per_match).slice(0, 50)
      return corsResp({ teams: enriched })
    }

    if (route === '/leaderboard/active' && method === 'GET') {
      const teams = await db.collection('teams').find({}).sort({ matches_played: -1 }).limit(50).toArray()
      return corsResp({ teams: teams.map(t => ({ ...clean(t), division: getDivision(t.rating) })) })
    }
    if (route === '/leaderboard/scorers' && method === 'GET') {
      const players = await db.collection('players').find({}).sort({ goals: -1 }).limit(50).toArray()
      // attach team names
      const teamIds = [...new Set(players.map(p => p.team_id))]
      const teams = await db.collection('teams').find({ id: { $in: teamIds } }).toArray()
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      return corsResp({ players: players.map(p => ({ ...clean(p), team_name: tmap[p.team_id] || '' })) })
    }
    if (route === '/leaderboard/assists' && method === 'GET') {
      const players = await db.collection('players').find({}).sort({ assists: -1 }).limit(50).toArray()
      const teamIds = [...new Set(players.map(p => p.team_id))]
      const teams = await db.collection('teams').find({ id: { $in: teamIds } }).toArray()
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      return corsResp({ players: players.map(p => ({ ...clean(p), team_name: tmap[p.team_id] || '' })) })
    }

    // ============ STATS / DIVISIONS ============
    if (route === '/divisions' && method === 'GET') {
      // aggregate counts
      const teams = await db.collection('teams').find({}).toArray()
      const counts = {}
      for (const t of teams) {
        const d = getDivision(t.rating).division
        counts[d] = (counts[d] || 0) + 1
      }
      const sample = { 1:2100, 2:1900, 3:1700, 4:1550, 5:1450, 6:1350, 7:1250, 8:1150, 9:1050, 10:900 }
      const divs = []
      for (let i = 1; i <= 10; i++) {
        divs.push({ ...getDivision(sample[i]), count: counts[i] || 0 })
      }
      return corsResp({ divisions: divs })
    }

    // ============ REFERRALS ============
    if (route === '/referrals/me' && method === 'GET') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      // ensure has a code
      let code = user.referral_code
      if (!code) {
        code = randCode(6)
        while (await db.collection('users').findOne({ referral_code: code })) code = randCode(6)
        await db.collection('users').updateOne({ id: user.id }, { $set: { referral_code: code } })
      }
      const referred = await db.collection('users').find({ referred_by: user.id }).project({ id:1, name:1, email:1, created_at:1 }).toArray()
      return corsResp({
        referral_code: code,
        referral_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?ref=${code}`,
        referrals_count: user.referrals_count || 0,
        referred: referred.map(({ _id, ...r }) => r),
      })
    }

    if (route === '/referrals/redeem' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      if (user.referred_by) return err('You already have a referrer', 400)
      const { code } = await request.json()
      const inviter = await db.collection('users').findOne({ referral_code: (code || '').toUpperCase() })
      if (!inviter) return err('Invalid referral code', 404)
      if (inviter.id === user.id) return err('Cannot refer yourself', 400)
      await db.collection('users').updateOne({ id: user.id }, { $set: { referred_by: inviter.id } })
      await db.collection('users').updateOne({ id: inviter.id }, { $inc: { referrals_count: 1 } })
      return corsResp({ ok: true })
    }

    // ============ ADMIN ============
    if (parts[0] === 'admin') {
      const user = await getSessionUser(request)
      if (!user?.is_admin) return err('forbidden', 403)

      if (route === '/admin/stats' && method === 'GET') {
        const [users, teams, matches, members, pendingRequests] = await Promise.all([
          db.collection('users').countDocuments(),
          db.collection('teams').countDocuments(),
          db.collection('matches').countDocuments(),
          db.collection('club_members').countDocuments({ status: 'active' }),
          db.collection('join_requests').countDocuments({ status: 'pending' }),
        ])
        return corsResp({ users, teams, matches, members, pending_requests: pendingRequests })
      }
    }

    // ============ ADVANCED STATS (free for everyone) ============
    if (parts[0] === 'teams' && parts[1] && parts[2] === 'advanced-stats' && method === 'GET') {
      const teamId = parts[1]
      const team = await db.collection('teams').findOne({ id: teamId })
      if (!team) return err('team not found', 404)
      const matches = await db.collection('matches').find({
        $or: [{ home_team_id: teamId }, { away_team_id: teamId }], status: 'confirmed'
      }).sort({ created_at: 1 }).toArray()
      // Build evolution: rating over time approximated from last_matches (delta chain)
      let r = 1000
      const evolution = []
      for (const m of matches) {
        const c = m.confirmations[m.home_team_id]
        if (!c) continue
        const isHome = m.home_team_id === teamId
        const sh = c.score_home, sa = c.score_away
        const result = (isHome ? sh > sa : sa > sh) ? 'W' : (sh === sa ? 'D' : 'L')
        evolution.push({ date: m.created_at, result, score: isHome ? `${sh}-${sa}` : `${sa}-${sh}`, opponent: isHome ? m.away_team_name : m.home_team_name })
      }
      const players = await db.collection('players').find({ team_id: teamId }).toArray()
      const contribution = players.map(p => ({ name: `${p.first_name} ${p.last_name}`, goals: p.goals || 0, assists: p.assists || 0, mvps: p.mvps || 0, matches: p.matches || 0 })).sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists))
      const goalTrend = (team.last_matches || []).slice().reverse().map((m, i) => ({ index: i+1, scored: parseInt(m.score.split('-')[0]) || 0, conceded: parseInt(m.score.split('-')[1]) || 0 }))
      return corsResp({
        evolution,
        goal_trend: goalTrend,
        contribution,
        summary: {
          total_matches: team.matches_played || 0,
          avg_goals_for: team.matches_played ? (team.goals_for / team.matches_played).toFixed(2) : 0,
          avg_goals_against: team.matches_played ? (team.goals_against / team.matches_played).toFixed(2) : 0,
          best_streak: team.best_streak || 0,
        }
      })
    }

    if (route === '/' || route === '/root') return corsResp({ message: 'FOOTUP API running' })

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API error', e)
    return err('Internal error: ' + e.message, 500)
  }
}

async function finalizeMatch(db, match) {
  const home = await db.collection('teams').findOne({ id: match.home_team_id })
  const away = await db.collection('teams').findOne({ id: match.away_team_id })
  if (!home || !away) return
  const c = match.confirmations[match.home_team_id]
  const sh = c.score_home, sa = c.score_away
  let scoreA
  if (sh > sa) scoreA = 1
  else if (sh < sa) scoreA = 0
  else scoreA = 0.5
  const importance = match.importance || 1
  const { newA, newB, deltaA, deltaB } = calcNewRatings(home.rating, away.rating, scoreA, home.streak, away.streak, importance)

  const oldDivHome = getDivision(home.rating).division
  const newDivHome = getDivision(newA).division
  const oldDivAway = getDivision(away.rating).division
  const newDivAway = getDivision(newB).division

  const homeDiff = sh - sa
  const awayDiff = sa - sh
  const currentSeason = getCurrentSeason()

  const homeUpd = {
    rating: newA,
    matches_played: (home.matches_played || 0) + 1,
    goals_for: (home.goals_for || 0) + sh,
    goals_against: (home.goals_against || 0) + sa,
    wins: home.wins + (scoreA === 1 ? 1 : 0),
    draws: home.draws + (scoreA === 0.5 ? 1 : 0),
    losses: home.losses + (scoreA === 0 ? 1 : 0),
    streak: scoreA === 1 ? (home.streak || 0) + 1 : 0,
    best_streak: scoreA === 1 ? Math.max(home.best_streak || 0, (home.streak || 0) + 1) : home.best_streak || 0,
    clean_sheets: (home.clean_sheets || 0) + (sa === 0 ? 1 : 0),
    largest_victory: homeDiff > (home.largest_victory || 0) && scoreA === 1 ? homeDiff : (home.largest_victory || 0),
    largest_defeat: homeDiff < (home.largest_defeat || 0) && scoreA === 0 ? homeDiff : (home.largest_defeat || 0),
    total_yellows: (home.total_yellows || 0) + ((c.yellows || []).length),
    total_reds: (home.total_reds || 0) + ((c.reds || []).length),
    last_matches: [{
      match_id: match.id, opponent: away.name, opponent_id: away.id, score: `${sh}-${sa}`,
      result: scoreA === 1 ? 'W' : scoreA === 0 ? 'L' : 'D', delta: deltaA, importance, season: currentSeason, date: new Date()
    }, ...(home.last_matches || [])].slice(0, 20),
    current_season: currentSeason,
  }
  const awayUpd = {
    rating: newB,
    matches_played: (away.matches_played || 0) + 1,
    goals_for: (away.goals_for || 0) + sa,
    goals_against: (away.goals_against || 0) + sh,
    wins: away.wins + (scoreA === 0 ? 1 : 0),
    draws: away.draws + (scoreA === 0.5 ? 1 : 0),
    losses: away.losses + (scoreA === 1 ? 1 : 0),
    streak: scoreA === 0 ? (away.streak || 0) + 1 : 0,
    best_streak: scoreA === 0 ? Math.max(away.best_streak || 0, (away.streak || 0) + 1) : away.best_streak || 0,
    clean_sheets: (away.clean_sheets || 0) + (sh === 0 ? 1 : 0),
    largest_victory: awayDiff > (away.largest_victory || 0) && scoreA === 0 ? awayDiff : (away.largest_victory || 0),
    largest_defeat: awayDiff < (away.largest_defeat || 0) && scoreA === 1 ? awayDiff : (away.largest_defeat || 0),
    total_yellows: (away.total_yellows || 0) + ((c.yellows || []).length),
    total_reds: (away.total_reds || 0) + ((c.reds || []).length),
    last_matches: [{
      match_id: match.id, opponent: home.name, opponent_id: home.id, score: `${sa}-${sh}`,
      result: scoreA === 0 ? 'W' : scoreA === 1 ? 'L' : 'D', delta: deltaB, importance, season: currentSeason, date: new Date()
    }, ...(away.last_matches || [])].slice(0, 20),
    current_season: currentSeason,
  }
  await db.collection('teams').updateOne({ id: home.id }, { $set: homeUpd })
  await db.collection('teams').updateOne({ id: away.id }, { $set: awayUpd })

  // Persist division change events
  if (newDivHome !== oldDivHome) {
    await db.collection('division_events').insertOne({
      id: uuidv4(), team_id: home.id, from_division: oldDivHome, to_division: newDivHome,
      type: newDivHome < oldDivHome ? 'promotion' : 'relegation', at: new Date(), season: currentSeason,
    })
  }
  if (newDivAway !== oldDivAway) {
    await db.collection('division_events').insertOne({
      id: uuidv4(), team_id: away.id, from_division: oldDivAway, to_division: newDivAway,
      type: newDivAway < oldDivAway ? 'promotion' : 'relegation', at: new Date(), season: currentSeason,
    })
  }

  // Player stats
  const bumpPlayers = async (goalsArr, assistsArr, yellowsArr, redsArr, mvp) => {
    for (const pid of goalsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { goals: 1 } })
    for (const pid of assistsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { assists: 1 } })
    for (const pid of yellowsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { yellows: 1 } })
    for (const pid of redsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { reds: 1 } })
    if (mvp) await db.collection('players').updateOne({ id: mvp }, { $inc: { mvps: 1 } })
  }
  await bumpPlayers(c.goals, c.assists, c.yellows, c.reds, c.mvp)
}

function getCurrentSeason() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  // Season runs Sep–Aug; before Sep => previous year label
  const startYear = m >= 8 ? y : y - 1
  return `${startYear}/${(startYear + 1).toString().slice(-2)}`
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
