import type { Measure, Person } from './types'
import { formatDate, voteStance } from './grades'

/**
 * Message drafting.
 *
 * Written against what congressional offices actually do with contacts, not
 * against intuition:
 *
 *  - Calls are tallied by position the moment they come in, and the daily
 *    for/against count is what reaches the member. So every script states the
 *    position in one countable word and asks explicitly for it to be logged.
 *    A message that does not resolve to "for" or "against" does not get counted.
 *  - Constituent status is the gate. City and ZIP go first, before anything
 *    else, or the contact is filtered.
 *  - Personalization is the largest single multiplier. The Congressional
 *    Management Foundation found ~90% of staff say individualized contact has
 *    "a lot of influence" on an undecided member, versus far less for form
 *    letters. So every draft cites that member's own vote, with the date.
 *  - The bright line is stated as a flat fact about the sender's own ballot,
 *    not as a threat at the office. Staff are trained to de-escalate hostile
 *    calls and log them as "angry constituent," a bucket that gets discounted.
 *    A cold voting rule gets logged as a position. Same message, harder landing.
 *  - One issue per contact. Everything not load-bearing is cut.
 */

export interface Draft {
  subject: string
  body: string
  /** ~30 seconds spoken. Longer than that and staff stop transcribing. */
  phoneScript: string
  /** The single word the office will write in the tally column. */
  tallyPosition: 'OPPOSED' | 'SUPPORTIVE'
}

function lastName(p: Person): string {
  return p.name.replace(/,.*$/, '').trim().split(/\s+/).slice(-1)[0]
}

function title(p: Person): string {
  return p.office === 'sen' ? 'Senator' : 'Representative'
}

function whereFrom(p: Person, place: string): string {
  const district =
    p.office === 'sen' || p.district === '0' ? p.state : `${p.state}-${p.district}`
  return place ? `${place}, ${district}` : district
}

interface CitedVote {
  position: string
  m: Measure
}

function topVotes(
  p: Person,
  measures: Map<string, Measure>,
  stance: 'pro' | 'anti',
  limit = 2,
): CitedVote[] {
  return p.votes
    .map((v) => ({ position: v.p, m: measures.get(v.m) }))
    .filter((x): x is CitedVote => Boolean(x.m))
    .filter((x) => voteStance(x.position, x.m) === stance)
    .sort((a, b) => b.m.significance - a.m.significance || b.m.date.localeCompare(a.m.date))
    .slice(0, limit)
}

/**
 * Describe a vote accurately.
 *
 * This must state the actual yes/no the member cast, not the stance we scored
 * it as. On a measure that RESTRICTS surveillance, the pro-surveillance vote is
 * a *no* — so writing "voted for [restricting measure]" would put a flatly false
 * claim in a message sent to their office. The effect clause carries the
 * meaning; the yes/no carries the fact.
 */
function describeVote(x: CitedVote, stance: 'pro' | 'anti', short = false): string {
  const cast = x.position === 'yea' ? 'yes' : 'no'
  const effect =
    stance === 'pro'
      ? x.m.pro_surveillance_position === 'yea'
        ? 'a vote to expand warrantless surveillance'
        : 'a vote to keep warrantless surveillance in place'
      : x.m.pro_surveillance_position === 'yea'
        ? 'a vote against expanding warrantless surveillance'
        : 'a vote to require a warrant'
  // Spoken aloud, bill numbers beat titles: they are shorter, and the staffer
  // taking the call recognises them faster than a full statutory name.
  return `voted ${cast} on ${short ? billNumber(x.m) : x.m.title} — ${effect}`
}

/** "HR7888" -> "H.R. 7888", "S4465" -> "S. 4465". */
function billNumber(m: Measure): string {
  const match = /^([A-Z]+)(\d+)$/.exec(m.identifier)
  if (!match) return m.identifier
  const [, prefix, num] = match
  const spaced = prefix.split('').join('.') + '.'
  return `${spaced} ${num}`
}

/** The bright line, stated once, the same way every time. */
const RULE =
  'I do not vote for anyone who votes to fund warrantless surveillance. ' +
  'That is a standing rule, not a reaction to one bill.'

export function buildDraft(
  p: Person,
  measuresList: Measure[],
  senderName = '[your name]',
  senderPlace = '',
): Draft {
  const measures = new Map(measuresList.map((m) => [m.slug, m]))
  const who = `${title(p)} ${lastName(p)}`
  const from = whereFrom(p, senderPlace)

  const pro = topVotes(p, measures, 'pro')
  const anti = topVotes(p, measures, 'anti')

  const supportive = p.grade === 'green'
  const tallyPosition: Draft['tallyPosition'] = supportive ? 'SUPPORTIVE' : 'OPPOSED'

  // -------------------------------------------------------------- supportive
  if (supportive) {
    const cited = anti[0]
    return {
      tallyPosition,
      subject: `Constituent, ${from} — log me SUPPORTIVE on surveillance`,
      phoneScript:
        `My name is ${senderName}. I'm a constituent in ${from}. ` +
        `Please log me SUPPORTIVE on surveillance funding.\n\n` +
        `${cited ? `On ${formatDate(cited.m.date)}, ${who} ${describeVote(cited, 'anti', true)}.` : ''}\n\n` +
        `${RULE} ${who} is on the right side of that line, and that is why they have my vote.\n\n` +
        `The ask is to hold it — no surveillance funding without a warrant requirement, ` +
        `no exceptions — and to say so before the next vote, not after.\n\n` +
        `Please log me SUPPORTIVE. Thank you.`,
      body: [
        `${who},`,
        '',
        `I am a constituent in ${from}. Please log this as SUPPORTIVE on surveillance funding.`,
        '',
        RULE,
        '',
        cited
          ? `You are on the right side of it. On ${formatDate(cited.m.date)} you ${describeVote(cited, 'anti')}. That is why you have my vote.`
          : `You are on the right side of it, and that is why you have my vote.`,
        '',
        `What I am asking is that you hold it, and say so before the next vote:`,
        `  1. No funding for surveillance without a warrant requirement.`,
        `  2. No federal money for local camera and plate-reader networks that lack audits and retention limits.`,
        `  3. Bar agencies from buying data they would need a warrant to compel.`,
        '',
        `A commitment before the vote is worth more than a statement after it.`,
        '',
        senderName,
        from,
      ].join('\n'),
    }
  }

  // ------------------------------------------------------------- opposed
  const cited = pro[0]
  const citedLine = cited
    ? `On ${formatDate(cited.m.date)}, ${who} ${describeVote(cited, 'pro')}.`
    : `${who} has not gone on record opposing surveillance funding.`

  // Roughly thirty seconds spoken. Past that, staff stop transcribing and just
  // mark the tally, so everything that is not the position, the reason, or the
  // ask is cut.
  const phoneScript =
    `My name is ${senderName}, constituent in ${from}. ` +
    `Please log me OPPOSED on surveillance funding.\n\n` +
    `${cited ? `On ${formatDate(cited.m.date)}, ${who} ${describeVote(cited, 'pro', true)}.` : citedLine}\n\n` +
    `${RULE} That took ${who} off my ballot. I'm not undecided, and this isn't a protest.\n\n` +
    `To change it: vote no on any surveillance funding without a warrant requirement, ` +
    `on the record, before the vote.\n\n` +
    `Please log me OPPOSED. Thank you.`

  const body = [
    `${who},`,
    '',
    `I am a constituent in ${from}. Please log this as OPPOSED on surveillance funding.`,
    '',
    RULE,
    '',
    `${citedLine} That is disqualifying for me, and it already cost you my vote.`,
    '',
    ...(pro.length > 1
      ? [
          `The record I am going on:`,
          ...pro.map((x) => `  • ${formatDate(x.m.date)} — ${describeVote(x, 'pro')}`),
          '',
        ]
      : []),
    ...(anti.length
      ? [
          `I do note that on ${formatDate(anti[0].m.date)} you ${describeVote(anti[0], 'anti')}. ` +
            `That is why I am writing rather than writing you off.`,
          '',
        ]
      : []),
    `This is reversible, and the terms are not complicated:`,
    `  1. Vote no on any bill funding surveillance without a warrant requirement.`,
    `  2. Vote no on federal money for local camera and plate-reader networks without audits and retention limits.`,
    `  3. Bar agencies from buying data they would need a warrant to compel.`,
    '',
    `Do those on the record and you are back in contention for my vote. Until then you are not.`,
    `I am one constituent, but I am not the only one keeping this list, and it is public.`,
    '',
    senderName,
    from,
  ].join('\n')

  return {
    tallyPosition,
    subject: `Constituent, ${from} — log me OPPOSED on surveillance funding`,
    phoneScript,
    body,
  }
}
