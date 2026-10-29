import { v4 as uuidv4 } from 'uuid'

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD']

// Returns the active membership of a user + the club document.
// Auto-backfills legacy 1:1 captain->team mapping into club_members.
export async function getMembership(db, userId) {
  if (!userId) return { membership: null, team: null }
  let m = await db.collection('club_members').findOne({ user_id: userId, status: 'active' })
  if (!m) {
    const legacy = await db.collection('teams').findOne({ captain_id: userId })
    if (legacy) {
      await db.collection('club_members').updateOne(
        { user_id: userId, club_id: legacy.id },
        { $setOnInsert: {
          id: uuidv4(), user_id: userId, club_id: legacy.id, role: 'captain',
          jersey_number: null, position: null, joined_at: legacy.created_at || new Date(), backfilled: true,
        }, $set: { status: 'active' } },
        { upsert: true }
      )
      m = await db.collection('club_members').findOne({ user_id: userId, club_id: legacy.id })
    }
  }
  if (!m) return { membership: null, team: null }
  const team = await db.collection('teams').findOne({ id: m.club_id })
  if (!team) {
    await db.collection('club_members').updateOne({ id: m.id }, { $set: { status: 'left', left_at: new Date() } })
    return { membership: null, team: null }
  }
  return { membership: m, team }
}

// Ensures a roster (players collection) entry linked to this user exists in the club
export async function ensurePlayerRecord(db, user, teamId, extra = {}) {
  const existing = await db.collection('players').findOne({ user_id: user.id, team_id: teamId })
  if (existing) return existing
  const [first, ...rest] = (user.name || '').split(' ')
  const player = {
    id: uuidv4(),
    team_id: teamId,
    user_id: user.id,
    first_name: first || user.name || '',
    last_name: rest.join(' '),
    shirt_number: extra.jersey_number ?? user.jersey_number ?? null,
    position: extra.position || user.position || 'MID',
    foot: user.preferred_foot || 'right',
    birth_year: user.birth_year || null,
    photo_url: user.avatar_url || null,
    is_captain: !!extra.is_captain,
    matches: 0, goals: 0, assists: 0, yellows: 0, reds: 0, mvps: 0,
    created_at: new Date(),
  }
  await db.collection('players').insertOne(player)
  return player
}

export function publicUser(u) {
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    avatar_url: u.avatar_url || null,
    bio: u.bio || '',
    position: u.position || null,
    preferred_foot: u.preferred_foot || null,
    jersey_number: u.jersey_number ?? null,
    city: u.city || '',
    birth_year: u.birth_year || null,
    is_founder: !!u.is_founder,
    created_at: u.created_at,
  }
}
