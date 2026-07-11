import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { getDb, hashPassword, verifyPassword, signToken, getSessionUser, makeAuthCookie } from '@/lib/auth'
import { calcNewRatings, getDivision, START_RATING } from '@/lib/elo'

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

    // ============ AUTH ============
    if (route === '/auth/register' && method === 'POST') {
      const { email, password, name } = await request.json()
      if (!email || !password) return err('email & password required')
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return err('Email already registered', 409)
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password_hash: hashPassword(password),
        avatar_url: null,
        role: 'captain',
        created_at: new Date(),
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
      const team = await db.collection('teams').findOne({ captain_id: user.id })
      return corsResp({ user, team: clean(team) })
    }

    // ============ TEAMS ============
    if (route === '/teams' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const existing = await db.collection('teams').findOne({ captain_id: user.id })
      if (existing) return err('You already have a team', 409)
      const body = await request.json()
      const team = {
        id: uuidv4(),
        captain_id: user.id,
        name: body.name,
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
      return corsResp({ team: clean(team) })
    }

    if (route === '/teams' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || ''
      const filter = q ? { $or: [
        { name: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ]} : {}
      const teams = await db.collection('teams').find(filter).limit(100).toArray()
      return corsResp({ teams: teams.map(t => ({ ...clean(t), division: getDivision(t.rating) })) })
    }

    // /teams/:id ; /teams/:id/players ; /teams/:id/follow
    if (parts[0] === 'teams' && parts[1]) {
      const teamId = parts[1]
      const team = await db.collection('teams').findOne({ id: teamId })
      if (!team) return err('team not found', 404)

      if (!parts[2] && method === 'GET') {
        const players = await db.collection('players').find({ team_id: teamId }).toArray()
        const posts = await db.collection('posts').find({ team_id: teamId }).sort({ created_at: -1 }).limit(20).toArray()
        return corsResp({
          team: { ...clean(team), division: getDivision(team.rating) },
          players: players.map(clean),
          posts: posts.map(clean),
        })
      }

      if (!parts[2] && method === 'PUT') {
        const user = await getSessionUser(request)
        if (!user || user.id !== team.captain_id) return err('forbidden', 403)
        const body = await request.json()
        const allowed = ['name','logo_url','cover_url','founded_year','description','primary_color','secondary_color','facility','city','province','football_type']
        const upd = {}
        for (const k of allowed) if (body[k] !== undefined) upd[k] = body[k]
        await db.collection('teams').updateOne({ id: teamId }, { $set: upd })
        const updated = await db.collection('teams').findOne({ id: teamId })
        return corsResp({ team: { ...clean(updated), division: getDivision(updated.rating) } })
      }

      if (parts[2] === 'players' && method === 'POST') {
        const user = await getSessionUser(request)
        if (!user || user.id !== team.captain_id) return err('forbidden', 403)
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
    }

    // ============ POSTS / FEED ============
    if (route === '/posts' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const team = await db.collection('teams').findOne({ captain_id: user.id })
      if (!team) return err('create a team first', 400)
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
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const team = await db.collection('teams').findOne({ captain_id: user.id })
      if (!team) return err('create a team first', 400)
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
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const myTeam = await db.collection('teams').findOne({ captain_id: user.id })
      if (!myTeam) return err('create a team first', 400)
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
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const team = await db.collection('teams').findOne({ captain_id: user.id })
      if (!team) return corsResp({ matches: [] })
      const matches = await db.collection('matches').find({
        $or: [{ home_team_id: team.id }, { away_team_id: team.id }]
      }).sort({ created_at: -1 }).limit(50).toArray()
      return corsResp({ matches: matches.map(clean) })
    }

    if (parts[0] === 'matches' && parts[1] && parts[2] === 'confirm' && method === 'POST') {
      const user = await getSessionUser(request)
      if (!user) return err('unauthorized', 401)
      const myTeam = await db.collection('teams').findOne({ captain_id: user.id })
      if (!myTeam) return err('no team', 400)
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
      const teams = await db.collection('teams').find({}).sort({ rating: -1 }).limit(50).toArray()
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
      const divs = []
      for (let i = 1; i <= 10; i++) {
        const rating = i === 1 ? 2000 : i === 10 ? 900 : 2000 - (i - 1) * 100
        divs.push({ ...getDivision(rating), count: counts[i] || 0 })
      }
      return corsResp({ divisions: divs })
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
  const { newA, newB, deltaA, deltaB } = calcNewRatings(home.rating, away.rating, scoreA, home.streak, away.streak)

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
    last_matches: [{ opponent: away.name, score: `${sh}-${sa}`, result: scoreA === 1 ? 'W' : scoreA === 0 ? 'L' : 'D', delta: deltaA, date: new Date() }, ...(home.last_matches || [])].slice(0, 10),
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
    last_matches: [{ opponent: home.name, score: `${sa}-${sh}`, result: scoreA === 0 ? 'W' : scoreA === 1 ? 'L' : 'D', delta: deltaB, date: new Date() }, ...(away.last_matches || [])].slice(0, 10),
  }
  await db.collection('teams').updateOne({ id: home.id }, { $set: homeUpd })
  await db.collection('teams').updateOne({ id: away.id }, { $set: awayUpd })

  // player stats update from goals/assists arrays (playerId strings)
  const bumpPlayers = async (goalsArr, assistsArr, yellowsArr, redsArr, mvp) => {
    for (const pid of goalsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { goals: 1, matches: 0 } })
    for (const pid of assistsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { assists: 1 } })
    for (const pid of yellowsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { yellows: 1 } })
    for (const pid of redsArr || []) await db.collection('players').updateOne({ id: pid }, { $inc: { reds: 1 } })
    if (mvp) await db.collection('players').updateOne({ id: mvp }, { $inc: { mvps: 1 } })
  }
  await bumpPlayers(c.goals, c.assists, c.yellows, c.reds, c.mvp)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
