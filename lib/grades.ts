import type { Grade, Measure, Person } from './types'

/**
 * Gray is deliberately split into two labels. Conflating "declined to vote"
 * with "we found no record" is unfair to a new member and lets a member who
 * dodged the vote hide behind the same badge. It is also the first thing a
 * press office attacks.
 */
export const GRADE_LABEL: Record<Grade, string> = {
  green: 'Voted against surveillance',
  red: 'Voted for surveillance',
  mixed: 'Mixed record',
  gray_declined: 'Declined to vote',
  gray_no_record: 'No record',
}

export const GRADE_SHORT: Record<Grade, string> = {
  green: 'Against',
  red: 'For',
  mixed: 'Mixed',
  gray_declined: 'Abstained',
  gray_no_record: 'No record',
}

export const GRADE_SYMBOL: Record<Grade, string> = {
  green: '✓',
  red: '✕',
  mixed: '±',
  gray_declined: '–',
  gray_no_record: '?',
}

/** Sort order for lists: worst-first is what an organizer wants to see. */
export const GRADE_RANK: Record<Grade, number> = {
  red: 0,
  mixed: 1,
  gray_declined: 2,
  gray_no_record: 3,
  green: 4,
}

export function partyLetter(party: string | null): string {
  if (!party) return ''
  if (party.startsWith('Democrat')) return 'D'
  if (party.startsWith('Republican')) return 'R'
  if (party.startsWith('Independent')) return 'I'
  return party[0]
}

export function officeTitle(p: Person): string {
  if (p.office === 'sen') return `U.S. Senator`
  if (!p.is_voting_member) return `Delegate to the U.S. House`
  return `U.S. Representative`
}

export function districtLabel(p: Person): string {
  if (p.office === 'sen') return p.state
  if (p.district === '0') return `${p.state} at-large`
  return `${p.state}-${p.district}`
}

/** How a member's vote on a measure reads in plain language. */
export function voteStance(
  position: string,
  measure: Measure,
): 'pro' | 'anti' | 'declined' {
  if (position === 'present' || position === 'not_voting') return 'declined'
  return position === measure.pro_surveillance_position ? 'pro' : 'anti'
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
