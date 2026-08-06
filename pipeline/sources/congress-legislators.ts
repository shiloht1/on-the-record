import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE_DIR, slugify } from '../lib/db.ts'

interface RawTerm {
  type: 'sen' | 'rep'
  start: string
  end: string
  state: string
  district?: number
  class?: number
  party?: string
  url?: string
  contact_form?: string
  phone?: string
  address?: string
  office?: string
}

interface RawLegislator {
  id: { bioguide: string; icpsr?: number; fec?: string[]; opensecrets?: string }
  name: { official_full?: string; first: string; last: string }
  bio?: { birthday?: string; gender?: string }
  terms: RawTerm[]
}

export interface Legislator {
  bioguide_id: string
  icpsr: number | null
  fec_candidate_id: string | null
  name: string
  slug: string
  party: string | null
  state: string
  district: string | null
  office: 'sen' | 'rep'
  ocd_id: string
  term_start: string
  term_end: string
  next_election_date: string
  phone: string | null
  contact_form: string | null
  website: string | null
  /** Delegates and the Resident Commissioner cannot vote on the House floor. */
  is_voting_member: boolean
}

/** Territories whose House members may not vote on final passage. */
const NON_VOTING_STATES = new Set(['DC', 'PR', 'GU', 'VI', 'AS', 'MP'])

/**
 * OCD district identifier.
 *
 * At-large states are the trap here: congress-legislators encodes at-large as
 * district 0, the Census geocoder returns "00", and OCD-IDs number them cd:1.
 * Getting this wrong silently orphans every voter in AK, DE, ND, SD, VT, and WY.
 */
export function ocdForDistrict(state: string, district: number | null | undefined): string {
  const base = `ocd-division/country:us/state:${state.toLowerCase()}`
  if (district === null || district === undefined) return base
  const n = Number(district)
  return `${base}/cd:${n === 0 ? 1 : n}`
}

/**
 * US federal elections are the Tuesday after the first Monday in November.
 * A term ending 2031-01-03 was won in November 2030.
 */
export function electionDayFor(termEnd: string): string {
  const year = Number(termEnd.slice(0, 4)) - 1
  const nov1 = new Date(Date.UTC(year, 10, 1))
  const dow = nov1.getUTCDay() // 0 = Sunday
  const firstMonday = 1 + ((8 - dow) % 7)
  const electionDay = firstMonday + 1
  return `${year}-11-${String(electionDay).padStart(2, '0')}`
}

export function loadLegislators(): Legislator[] {
  const path = join(CACHE_DIR, 'legislators-current.json')
  if (!existsSync(path)) {
    throw new Error('Missing legislators-current.json in data/cache. Run: npm run data:fetch')
  }

  const raw = JSON.parse(readFileSync(path, 'utf8')) as RawLegislator[]
  const seenSlugs = new Map<string, number>()

  return raw.map((l) => {
    const term = l.terms[l.terms.length - 1]
    const name = l.name.official_full ?? `${l.name.first} ${l.name.last}`

    // Disambiguate the occasional shared name (there have been two Rep. Mike
    // Johnsons and two Rep. Scott Peters-alikes over the years).
    let slug = slugify(name)
    const count = seenSlugs.get(slug) ?? 0
    seenSlugs.set(slug, count + 1)
    if (count > 0) slug = `${slug}-${term.state.toLowerCase()}`

    const district =
      term.type === 'rep' ? String(term.district ?? 0) : null

    return {
      bioguide_id: l.id.bioguide,
      icpsr: l.id.icpsr ?? null,
      fec_candidate_id: l.id.fec?.[0] ?? null,
      name,
      slug,
      party: term.party ?? null,
      state: term.state,
      district,
      office: term.type,
      ocd_id:
        term.type === 'sen'
          ? `ocd-division/country:us/state:${term.state.toLowerCase()}`
          : ocdForDistrict(term.state, term.district),
      term_start: term.start,
      term_end: term.end,
      next_election_date: electionDayFor(term.end),
      phone: term.phone ?? null,
      // Sparse in practice: only 2 of 437 House members publish one here, and
      // 86 of 100 senators. lib/compose-links.ts falls back to the member's
      // official site, and the UI leads with phone, which is populated for
      // every single member.
      contact_form: term.contact_form ?? null,
      website: term.url ?? null,
      is_voting_member: !(term.type === 'rep' && NON_VOTING_STATES.has(term.state)),
    }
  })
}
