// ELO rating & divisions for FOOTUP
export const K_FACTOR = 32
export const START_RATING = 1000

export function expectedScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400))
}

// score: 1 = win, 0.5 = draw, 0 = loss
// importance: 1 = friendly/league, 1.5 = tournament group, 2 = tournament knockout, 2.5 = final
export function calcNewRatings(rA, rB, scoreA, streakA = 0, streakB = 0, importance = 1) {
  const K = K_FACTOR * importance
  const eA = expectedScore(rA, rB)
  const eB = expectedScore(rB, rA)
  const scoreB = 1 - scoreA
  const bonusA = scoreA === 1 ? Math.min(streakA, 5) * 1.5 : 0
  const bonusB = scoreB === 1 ? Math.min(streakB, 5) * 1.5 : 0
  // Upset bonus: underdog beating a much stronger team
  const upsetA = scoreA === 1 && rA < rB ? Math.min((rB - rA) / 40, 8) : 0
  const upsetB = scoreB === 1 && rB < rA ? Math.min((rA - rB) / 40, 8) : 0
  const newA = Math.round(rA + K * (scoreA - eA) + bonusA + upsetA)
  const newB = Math.round(rB + K * (scoreB - eB) + bonusB + upsetB)
  return { newA, newB, deltaA: newA - rA, deltaB: newB - rB }
}

export function getDivision(rating) {
  if (rating >= 2000) return { division: 1, name: 'Division 1', color: '#f59e0b', tier: 'Elite' }
  if (rating >= 1800) return { division: 2, name: 'Division 2', color: '#e11d48', tier: 'Master' }
  if (rating >= 1650) return { division: 3, name: 'Division 3', color: '#a855f7', tier: 'Diamond' }
  if (rating >= 1500) return { division: 4, name: 'Division 4', color: '#3b82f6', tier: 'Platinum' }
  if (rating >= 1400) return { division: 5, name: 'Division 5', color: '#06b6d4', tier: 'Gold' }
  if (rating >= 1300) return { division: 6, name: 'Division 6', color: '#10b981', tier: 'Silver' }
  if (rating >= 1200) return { division: 7, name: 'Division 7', color: '#84cc16', tier: 'Bronze' }
  if (rating >= 1100) return { division: 8, name: 'Division 8', color: '#eab308', tier: 'Iron' }
  if (rating >= 1000) return { division: 9, name: 'Division 9', color: '#94a3b8', tier: 'Wood' }
  return { division: 10, name: 'Division 10', color: '#64748b', tier: 'Rookie' }
}

// -------- Team Reputation (EA FC-style, 40-99) --------
function clamp(n, min = 40, max = 99) { return Math.max(min, Math.min(max, Math.round(n))) }

export function computeReputation(team) {
  const matches = team.matches_played || 0
  if (matches === 0) {
    return { overall: 50, attack: 50, defense: 50, discipline: 65, activity: 45, experience: 42 }
  }
  const wr = (team.wins || 0) / matches
  const gpm = (team.goals_for || 0) / matches
  const gapm = (team.goals_against || 0) / matches
  const rating = team.rating || 1000

  const attack = clamp(50 + gpm * 7 + wr * 20 + Math.max(0, rating - 1000) / 30)
  const defense = clamp(80 - gapm * 8 + wr * 12 + Math.max(0, rating - 1000) / 40)
  // Fair play: fewer cards over matches. Placeholder if no card data.
  const cardsPerMatch = ((team.total_yellows || 0) + (team.total_reds || 0) * 2) / Math.max(1, matches)
  const discipline = clamp(90 - cardsPerMatch * 12)
  const activity = clamp(45 + Math.log2(matches + 1) * 9)
  const experience = clamp(42 + Math.log2(matches + 1) * 8 + (team.best_streak || 0) * 1.5)

  // Overall = weighted mix of sub-ratings and ELO
  const eloComp = clamp(40 + Math.max(0, Math.min(1200, rating - 800)) / 1200 * 59, 40, 99)
  const overall = clamp(
    attack * 0.22 + defense * 0.22 + discipline * 0.08 + activity * 0.08 + experience * 0.10 + eloComp * 0.30
  )
  return { overall, attack, defense, discipline, activity, experience }
}

// -------- Badges (computed) --------
export function computeBadges(team) {
  const b = []
  if (team.is_founder) b.push({ id: 'founder', label: 'Founder Team', color: 'from-fuchsia-500 to-purple-600' })
  if ((team.wins || 0) >= 1) b.push({ id: 'first_win', label: 'First Victory', color: 'from-emerald-500 to-cyan-500' })
  if ((team.wins || 0) >= 10) b.push({ id: '10_wins', label: '10 Wins Club', color: 'from-amber-400 to-orange-500' })
  if ((team.wins || 0) >= 50) b.push({ id: '50_wins', label: '50 Wins Legend', color: 'from-yellow-400 to-red-500' })
  if ((team.wins || 0) >= 100) b.push({ id: '100_wins', label: 'Century Club', color: 'from-red-500 to-purple-600' })
  if ((team.best_streak || 0) >= 3) b.push({ id: 'on_fire', label: 'On Fire', color: 'from-orange-400 to-red-500' })
  if ((team.best_streak || 0) >= 10) b.push({ id: 'unstoppable', label: 'Unstoppable', color: 'from-rose-500 to-fuchsia-600' })
  if ((team.goals_for || 0) >= 100) b.push({ id: 'century_goals', label: 'Century of Goals', color: 'from-emerald-400 to-teal-500' })
  if ((team.goals_for || 0) >= 500) b.push({ id: '500_goals', label: '500 Goals', color: 'from-lime-400 to-emerald-600' })
  if ((team.clean_sheets || 0) >= 10) b.push({ id: 'the_wall', label: 'The Wall', color: 'from-sky-500 to-blue-700' })
  if ((team.tournament_wins || 0) >= 1) b.push({ id: 'tourney_champ', label: 'Tournament Champion', color: 'from-amber-300 to-yellow-500' })
  if ((team.total_reds || 0) === 0 && (team.matches_played || 0) >= 20) b.push({ id: 'fair_play', label: 'Fair Play', color: 'from-emerald-500 to-green-600' })
  if ((team.rating || 0) >= 1800) b.push({ id: 'elite', label: 'Elite Team', color: 'from-amber-400 to-red-600' })
  return b
}

