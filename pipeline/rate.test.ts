import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeGrade, stanceForVote, type ScoredItem } from './rate.ts'
import { electionDayFor, ocdForDistrict } from './sources/congress-legislators.ts'
import { castCodeToPosition } from './sources/voteview.ts'

const item = (over: Partial<ScoredItem> = {}): ScoredItem => ({
  stance: 'pro_surveillance',
  tier: 1,
  evidence_id: 'e1',
  label: 'test',
  date: '2024-04-12',
  significance: 3,
  ...over,
})

// ---------------------------------------------------------------------------
// Direction. Getting this backwards is the worst bug this project can have:
// it would label the members who fought surveillance as its supporters.
// ---------------------------------------------------------------------------

test('yea on a pro-surveillance measure is pro-surveillance', () => {
  assert.equal(stanceForVote('yea', 'yea'), 'pro_surveillance')
})

test('yea on a RESTRICTING measure is anti-surveillance', () => {
  // e.g. the Biggs warrant amendment: voting yes requires a warrant.
  assert.equal(stanceForVote('yea', 'nay'), 'anti_surveillance')
})

test('nay on a restricting measure is pro-surveillance', () => {
  assert.equal(stanceForVote('nay', 'nay'), 'pro_surveillance')
})

test('present and not-voting are declined, never a stance', () => {
  assert.equal(stanceForVote('present', 'yea'), 'declined')
  assert.equal(stanceForVote('not_voting', 'nay'), 'declined')
})

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

test('only pro votes grades red', () => {
  assert.equal(computeGrade([item(), item()], 0).grade, 'red')
})

test('only anti votes grades green', () => {
  assert.equal(computeGrade([item({ stance: 'anti_surveillance' })], 0).grade, 'green')
})

test('votes both ways grades mixed and keeps both counts', () => {
  const r = computeGrade([item(), item({ stance: 'anti_surveillance' })], 0)
  assert.equal(r.grade, 'mixed')
  assert.equal(r.pro_count, 1)
  assert.equal(r.anti_count, 1)
})

test('abstentions alone grade as declined, not as no record', () => {
  assert.equal(computeGrade([], 3).grade, 'gray_declined')
})

test('nothing at all grades as no record', () => {
  assert.equal(computeGrade([], 0).grade, 'gray_no_record')
})

test('substantive votes outrank abstentions', () => {
  // Someone who voted on three measures and missed one is judged on the votes.
  const r = computeGrade([item({ stance: 'anti_surveillance' })], 1)
  assert.equal(r.grade, 'green')
  assert.equal(r.declined_count, 1)
})

// ---------------------------------------------------------------------------
// The tier rule: the single safeguard that stops one screenshot from
// discrediting the database.
// ---------------------------------------------------------------------------

test('tier-3 evidence alone can never produce red', () => {
  const r = computeGrade([item({ tier: 3 }), item({ tier: 3 })], 0)
  assert.equal(r.grade, 'gray_no_record')
  assert.equal(r.best_tier, 3)
  assert.match(r.rationale, /statements/i)
})

test('tier-3 evidence alone can never produce green', () => {
  assert.equal(computeGrade([item({ stance: 'anti_surveillance', tier: 3 })], 0).grade, 'gray_no_record')
})

test('tier-2 evidence can produce a grade', () => {
  assert.equal(computeGrade([item({ tier: 2 })], 0).grade, 'red')
})

test('tier-3 does not dilute a real tier-1 record', () => {
  // A stray press release must not turn a clean record into "mixed".
  const r = computeGrade([item({ tier: 1 }), item({ stance: 'anti_surveillance', tier: 3 })], 0)
  assert.equal(r.grade, 'red')
  assert.equal(r.anti_count, 0)
})

test('equivocal statements never count toward a grade', () => {
  assert.equal(computeGrade([item({ stance: 'equivocal', tier: 1 })], 0).grade, 'gray_no_record')
})

// ---------------------------------------------------------------------------
// Delegates
// ---------------------------------------------------------------------------

test('a delegate is never accused of declining a vote they cannot cast', () => {
  const r = computeGrade([], 5, false)
  assert.equal(r.grade, 'gray_no_record')
  assert.match(r.rationale, /may not vote|limits of the office/i)
})

test('a delegate who did vote is still graded on that vote', () => {
  // Delegates may vote in the Committee of the Whole.
  assert.equal(computeGrade([item({ stance: 'anti_surveillance' })], 0, false).grade, 'green')
})

// ---------------------------------------------------------------------------
// Upstream mappings
// ---------------------------------------------------------------------------

test('voteview paired and announced votes map to the position taken', () => {
  assert.equal(castCodeToPosition(1), 'yea') // Yea
  assert.equal(castCodeToPosition(2), 'yea') // Paired Yea
  assert.equal(castCodeToPosition(3), 'yea') // Announced Yea
  assert.equal(castCodeToPosition(4), 'nay') // Announced Nay
  assert.equal(castCodeToPosition(5), 'nay') // Paired Nay
  assert.equal(castCodeToPosition(6), 'nay') // Nay
  assert.equal(castCodeToPosition(9), 'not_voting')
  assert.equal(castCodeToPosition(0), null) // not a member — must be dropped
})

test('at-large districts map to cd:1, not cd:0', () => {
  // Miss this and every voter in AK, DE, ND, SD, VT, WY gets no representative.
  assert.equal(ocdForDistrict('AK', 0), 'ocd-division/country:us/state:ak/cd:1')
  assert.equal(ocdForDistrict('NY', 12), 'ocd-division/country:us/state:ny/cd:12')
})

test('election day is the Tuesday after the first Monday in November', () => {
  // A term ending 2027-01-03 was won in November 2026.
  assert.equal(electionDayFor('2027-01-03'), '2026-11-03')
  assert.equal(electionDayFor('2031-01-03'), '2030-11-05')
  assert.equal(electionDayFor('2029-01-03'), '2028-11-07')
})
