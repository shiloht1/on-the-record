import { id, type DB } from './lib/db.ts'
import type { Grade, Stance, Tier, VotePosition } from './lib/types.ts'

/**
 * The rating engine.
 *
 * Two rules do most of the work of keeping this defensible:
 *
 *  1. Direction comes from the measure, never the vote. An amendment that
 *     RESTRICTS surveillance scores a YEA as anti-surveillance. Every measure
 *     declares `pro_surveillance_position` explicitly for this reason.
 *
 *  2. Tier 3 evidence — press releases, interviews, social posts — can never
 *     by itself produce a green or red badge. Someone's record is what they
 *     did on the record, not what they said on a podcast. This is the single
 *     rule that stops one screenshot from discrediting the whole project.
 */

export interface ScoredItem {
  stance: Stance
  tier: Tier
  evidence_id: string
  label: string
  date: string | null
  significance: number
}

/** How a member's vote maps to a stance, given the measure's direction. */
export function stanceForVote(
  position: VotePosition,
  proSurveillancePosition: 'yea' | 'nay',
): Stance | 'declined' {
  if (position === 'present' || position === 'not_voting') return 'declined'
  return position === proSurveillancePosition ? 'pro_surveillance' : 'anti_surveillance'
}

export interface GradeResult {
  grade: Grade
  pro_count: number
  anti_count: number
  declined_count: number
  best_tier: Tier | null
  rationale: string
}

export function computeGrade(items: ScoredItem[], declinedCount: number, isVotingMember = true): GradeResult {
  // Only tier 1 and 2 count toward the grade. Tier 3 is displayed, not scored.
  const scoring = items.filter((i) => i.tier <= 2 && i.stance !== 'equivocal')
  const pro = scoring.filter((i) => i.stance === 'pro_surveillance').length
  const anti = scoring.filter((i) => i.stance === 'anti_surveillance').length

  const bestTier = items.length
    ? (Math.min(...items.map((i) => i.tier)) as Tier)
    : null

  if (pro > 0 && anti > 0) {
    return {
      grade: 'mixed',
      pro_count: pro,
      anti_count: anti,
      declined_count: declinedCount,
      best_tier: bestTier,
      rationale:
        `Voted to expand or extend surveillance authority ${pro} time${pro === 1 ? '' : 's'} ` +
        `and to restrict it ${anti} time${anti === 1 ? '' : 's'}. See the full list below — ` +
        `a mixed record often means this office is persuadable on a specific vote.`,
    }
  }

  if (pro > 0) {
    return {
      grade: 'red',
      pro_count: pro,
      anti_count: 0,
      declined_count: declinedCount,
      best_tier: bestTier,
      rationale:
        `Voted to expand or extend surveillance authority ${pro} time${pro === 1 ? '' : 's'}, ` +
        `with no recorded votes or formal actions the other way.`,
    }
  }

  if (anti > 0) {
    return {
      grade: 'green',
      pro_count: 0,
      anti_count: anti,
      declined_count: declinedCount,
      best_tier: bestTier,
      rationale:
        `Voted to restrict surveillance authority ${anti} time${anti === 1 ? '' : 's'}, ` +
        `with no recorded votes or formal actions the other way.`,
    }
  }

  // Checked BEFORE the declined branch. Delegates are recorded by Voteview as
  // "not voting" on final passage because they are barred from voting on it —
  // scoring that as "declined to vote" would accuse them of dodging a vote they
  // were never allowed to cast. Real votes (mixed/red/green above) still count,
  // since delegates may vote in the Committee of the Whole.
  if (!isVotingMember) {
    return {
      grade: 'gray_no_record',
      pro_count: 0,
      anti_count: 0,
      declined_count: 0,
      best_tier: bestTier,
      rationale:
        `Represents a territory or district whose member of Congress may not vote ` +
        `on final passage in the House. The absence of votes here reflects the ` +
        `limits of the office, not a choice by the officeholder.`,
    }
  }

  if (declinedCount > 0) {
    return {
      grade: 'gray_declined',
      pro_count: 0,
      anti_count: 0,
      declined_count: declinedCount,
      best_tier: bestTier,
      rationale:
        `Held office for ${declinedCount} tracked surveillance vote` +
        `${declinedCount === 1 ? '' : 's'} and did not vote on ${declinedCount === 1 ? 'it' : 'any of them'}. ` +
        `Not voting is not the same as having no record — it is a choice, and it ` +
        `is why this office is not marked green.`,
    }
  }

  if (bestTier === 3) {
    return {
      grade: 'gray_no_record',
      pro_count: 0,
      anti_count: 0,
      declined_count: 0,
      best_tier: 3,
      rationale:
        `Has made public statements on surveillance but has no recorded vote or ` +
        `formal action on a tracked measure. Statements alone do not earn a green ` +
        `or red mark here. Their statements are listed below.`,
    }
  }

  return {
    grade: 'gray_no_record',
    pro_count: 0,
    anti_count: 0,
    declined_count: 0,
    best_tier: null,
    rationale:
      `No recorded vote or formal action on any tracked surveillance measure. ` +
      `This usually means they took office after the votes we track. It is not a ` +
      `finding against them — it means there is nothing yet to report.`,
  }
}

/** Rebuild every rating from scratch. Ratings are derived, never hand-edited. */
export function rebuildRatings(db: DB, topic = 'surveillance'): number {
  db.prepare('DELETE FROM rating_evidence').run()
  db.prepare('DELETE FROM ratings').run()

  const people = db
    .prepare('SELECT id, is_voting_member FROM people WHERE in_office = 1')
    .all() as { id: string; is_voting_member: number }[]

  const voteRows = db
    .prepare(`
      SELECT v.person_id, v.position, v.evidence_id,
             m.pro_surveillance_position, m.title, m.date, m.significance,
             e.tier
      FROM votes v
      JOIN measures m ON m.id = v.measure_id
      JOIN evidence e ON e.id = v.evidence_id
      WHERE m.topic = ?
    `)
    .all(topic) as {
      person_id: string
      position: VotePosition
      evidence_id: string
      pro_surveillance_position: 'yea' | 'nay'
      title: string
      date: string
      significance: number
      tier: Tier
    }[]

  const actionRows = db
    .prepare(`
      SELECT a.person_id, a.stance, a.summary, a.date, a.evidence_id, e.tier
      FROM actions a
      JOIN evidence e ON e.id = a.evidence_id
      WHERE a.topic = ?
    `)
    .all(topic) as {
      person_id: string
      stance: Stance
      summary: string
      date: string | null
      evidence_id: string
      tier: Tier
    }[]

  const byPerson = new Map<string, { items: ScoredItem[]; declined: number }>()
  const bucket = (pid: string) => {
    let b = byPerson.get(pid)
    if (!b) byPerson.set(pid, (b = { items: [], declined: 0 }))
    return b
  }

  for (const r of voteRows) {
    const stance = stanceForVote(r.position, r.pro_surveillance_position)
    const b = bucket(r.person_id)
    if (stance === 'declined') {
      b.declined++
      continue
    }
    b.items.push({
      stance,
      tier: r.tier,
      evidence_id: r.evidence_id,
      label: r.title,
      date: r.date,
      significance: r.significance,
    })
  }

  for (const r of actionRows) {
    bucket(r.person_id).items.push({
      stance: r.stance,
      tier: r.tier,
      evidence_id: r.evidence_id,
      label: r.summary,
      date: r.date,
      significance: 1,
    })
  }

  const insertRating = db.prepare(`
    INSERT INTO ratings (id, person_id, topic, grade, pro_count, anti_count,
                         declined_count, best_tier, rationale, computed_at)
    VALUES (@id, @person_id, @topic, @grade, @pro_count, @anti_count,
            @declined_count, @best_tier, @rationale, @computed_at)
  `)
  const insertRatingEvidence = db.prepare(`
    INSERT OR IGNORE INTO rating_evidence (rating_id, evidence_id) VALUES (?, ?)
  `)

  const computedAt = new Date().toISOString()
  let count = 0

  const run = db.transaction(() => {
    for (const person of people) {
      const b = byPerson.get(person.id) ?? { items: [], declined: 0 }
      const result = computeGrade(b.items, b.declined, person.is_voting_member === 1)
      const ratingId = id('rating', person.id, topic)

      insertRating.run({
        id: ratingId,
        person_id: person.id,
        topic,
        grade: result.grade,
        pro_count: result.pro_count,
        anti_count: result.anti_count,
        declined_count: result.declined_count,
        best_tier: result.best_tier,
        rationale: result.rationale,
        computed_at: computedAt,
      })

      for (const item of b.items) insertRatingEvidence.run(ratingId, item.evidence_id)
      count++
    }
  })
  run()

  return count
}
