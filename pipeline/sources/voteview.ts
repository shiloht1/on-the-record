import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { CACHE_DIR } from '../lib/db.ts'
import type { VotePosition } from '../lib/types.ts'

/**
 * Voteview cast codes.
 * https://voteview.com/articles/data_help_votes
 *
 * Paired and announced positions (2/3 and 4/5) are recorded stances that are
 * not counted in the official tally. We map them to the position the member
 * took, because a scorecard is about where someone stood, not about the
 * arithmetic of the tally.
 */
const CAST_CODES: Record<number, VotePosition | null> = {
  0: null, // not a member of this chamber at the time
  1: 'yea', // Yea
  2: 'yea', // Paired Yea
  3: 'yea', // Announced Yea
  4: 'nay', // Announced Nay
  5: 'nay', // Paired Nay
  6: 'nay', // Nay
  7: 'present',
  8: 'present',
  9: 'not_voting',
}

export function castCodeToPosition(code: number): VotePosition | null {
  return CAST_CODES[code] ?? null
}

export interface VoteviewMember {
  congress: number
  chamber: string
  icpsr: number
  bioguide_id: string
  bioname: string
  state_abbrev: string
  district_code: string
  party_code: string
}

export interface VoteviewVote {
  congress: number
  chamber: string
  rollnumber: number
  icpsr: number
  cast_code: number
}

export interface VoteviewRollcall {
  congress: number
  chamber: string
  rollnumber: number
  clerk_rollnumber: string
  date: string
  bill_number: string
  vote_result: string
  vote_desc: string
  vote_question: string
  yea_count: string
  nay_count: string
}

function read(file: string): string {
  const path = join(CACHE_DIR, file)
  if (!existsSync(path)) {
    throw new Error(`Missing ${file} in data/cache. Run: npm run data:fetch`)
  }
  return readFileSync(path, 'utf8')
}

/**
 * All parsing goes through csv-parse rather than split(','). Voteview's
 * `bioname` and `vote_desc` fields contain quoted commas — splitting on comma
 * silently shifts every subsequent column, which would produce plausible-looking
 * but completely wrong vote records.
 */
function parseCsv<T>(text: string): T[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[]
}

/** icpsr -> bioguide_id, the join key between Voteview and everything else. */
export function loadMemberIndex(congresses: number[]): Map<number, VoteviewMember> {
  const index = new Map<number, VoteviewMember>()

  for (const congress of congresses) {
    for (const chamber of ['H', 'S']) {
      const rows = parseCsv<Record<string, string>>(read(`${chamber}${congress}_members.csv`))
      for (const r of rows) {
        const icpsr = Number(r.icpsr)
        const bioguide = (r.bioguide_id ?? '').trim()
        if (!icpsr || !bioguide) continue
        // Later congresses win, so a member's most recent identity is used.
        index.set(icpsr, {
          congress: Number(r.congress),
          chamber: r.chamber,
          icpsr,
          bioguide_id: bioguide,
          bioname: r.bioname,
          state_abbrev: r.state_abbrev,
          district_code: r.district_code,
          party_code: r.party_code,
        })
      }
    }
  }

  return index
}

/**
 * Votes for a specific set of (congress, chamber, rollnumber) triples.
 * Filtering during parse keeps memory flat regardless of file size.
 */
export function loadVotesFor(
  wanted: { congress: number; chamber: string; rollnumber: number }[],
): Map<string, { icpsr: number; position: VotePosition }[]> {
  const keyOf = (c: number, ch: string, r: number) => `${c}|${ch}|${r}`

  const want = new Set(wanted.map((w) => keyOf(w.congress, w.chamber, w.rollnumber)))
  const out = new Map<string, { icpsr: number; position: VotePosition }[]>()

  const files = new Set(
    wanted.map((w) => `${w.chamber.startsWith('H') ? 'H' : 'S'}${w.congress}_votes.csv`),
  )

  for (const file of files) {
    const rows = parseCsv<Record<string, string>>(read(file))
    for (const r of rows) {
      const congress = Number(r.congress)
      const rollnumber = Number(r.rollnumber)
      const key = keyOf(congress, r.chamber, rollnumber)
      if (!want.has(key)) continue

      const position = castCodeToPosition(Number(r.cast_code))
      if (!position) continue

      let list = out.get(key)
      if (!list) out.set(key, (list = []))
      list.push({ icpsr: Number(r.icpsr), position })
    }
  }

  return out
}

/** Rollcall metadata, keyed by congress|chamber|rollnumber. */
export function loadRollcalls(congresses: number[]): Map<string, VoteviewRollcall> {
  const rows = parseCsv<Record<string, string>>(read('HSall_rollcalls.csv'))
  const set = new Set(congresses)
  const out = new Map<string, VoteviewRollcall>()

  for (const r of rows) {
    const congress = Number(r.congress)
    if (!set.has(congress)) continue
    const rollnumber = Number(r.rollnumber)
    out.set(`${congress}|${r.chamber}|${rollnumber}`, {
      congress,
      chamber: r.chamber,
      rollnumber,
      clerk_rollnumber: r.clerk_rollnumber,
      date: r.date,
      bill_number: r.bill_number,
      vote_result: r.vote_result,
      vote_desc: r.vote_desc,
      vote_question: r.vote_question,
      yea_count: r.yea_count,
      nay_count: r.nay_count,
    })
  }

  return out
}
