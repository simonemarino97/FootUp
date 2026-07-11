// ELO rating & divisions for FOOTUP
export const K_FACTOR = 32
export const START_RATING = 1000

export function expectedScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400))
}

// score: 1 = win, 0.5 = draw, 0 = loss
export function calcNewRatings(rA, rB, scoreA, streakA = 0, streakB = 0) {
  const eA = expectedScore(rA, rB)
  const eB = expectedScore(rB, rA)
  const scoreB = 1 - scoreA
  // streak bonus (small)
  const bonusA = scoreA === 1 ? Math.min(streakA, 5) * 1.5 : 0
  const bonusB = scoreB === 1 ? Math.min(streakB, 5) * 1.5 : 0
  const newA = Math.round(rA + K_FACTOR * (scoreA - eA) + bonusA)
  const newB = Math.round(rB + K_FACTOR * (scoreB - eB) + bonusB)
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
