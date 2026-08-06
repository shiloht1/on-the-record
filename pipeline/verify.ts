/**
 * Verification gate. Run after every build.
 *
 * These are not unit tests of the code — they are assertions about the world.
 * If Voteview changes a cast code, or a curated file gets a direction backwards,
 * or an ICPSR/bioguide join silently drops half a chamber, the numbers below
 * stop matching the historical record and this fails.
 */
import { openDb } from './lib/db.ts'

let failures = 0
let checks = 0

function check(label: string, actual: unknown, expected: unknown) {
  checks++
  const ok = actual === expected
  if (!ok) {
    failures++
    console.error(`  FAIL  ${label}\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  } else {
    console.log(`  ok    ${label}`)
  }
}

function checkAtLeast(label: string, actual: number, min: number) {
  checks++
  if (actual < min) {
    failures++
    console.error(`  FAIL  ${label}\n        expected >= ${min}, got ${actual}`)
  } else {
    console.log(`  ok    ${label} (${actual})`)
  }
}

const db = openDb()

// ---------------------------------------------------------------------------
console.log('\nTallies match the historical record')
// ---------------------------------------------------------------------------
// Independently verifiable against the Clerk of the House and Senate.gov.
const TALLIES: [string, number, number][] = [
  ['risaa-2024-house-biggs-warrant-amendment', 212, 212], // the famous tie
  ['risaa-2024-house-passage', 273, 147],
  ['fourth-amendment-not-for-sale-2024-house-passage', 219, 199],
  ['risaa-2024-senate-passage', 60, 34],
  ['risaa-2024-senate-warrant-amendment', 42, 50],
  ['risaa-2024-senate-append-fourth-amendment', 31, 61],
  ['fisa-702-2026-house-clean-extension', 261, 111],
  ['fisa-702-2026-house-three-week-extension', 198, 218],
]
for (const [slug, yea, nay] of TALLIES) {
  const m = db.prepare('SELECT yea_count, nay_count FROM measures WHERE slug = ?').get(slug) as
    | { yea_count: number; nay_count: number }
    | undefined
  check(`${slug} yea`, m?.yea_count, yea)
  check(`${slug} nay`, m?.nay_count, nay)
}

// ---------------------------------------------------------------------------
console.log('\nGolden votes (checked by hand against the official record)')
// ---------------------------------------------------------------------------
// Chosen because they are unambiguous and well documented. An ICPSR/bioguide
// join error, or a flipped direction, breaks these immediately.
const GOLDEN: [string, string, string, string][] = [
  // bioguide, name, measure slug, expected position
  ['B001302', 'Andy Biggs', 'risaa-2024-house-biggs-warrant-amendment', 'yea'], // his own amendment
  ['B001302', 'Andy Biggs', 'risaa-2024-house-passage', 'nay'],
  ['M001184', 'Thomas Massie', 'risaa-2024-house-passage', 'nay'],
  ['L000397', 'Zoe Lofgren', 'risaa-2024-house-biggs-warrant-amendment', 'yea'],
  ['P000603', 'Rand Paul', 'risaa-2024-senate-passage', 'nay'],
  ['W000779', 'Ron Wyden', 'risaa-2024-senate-passage', 'nay'],
  ['W000779', 'Ron Wyden', 'risaa-2024-senate-warrant-amendment', 'yea'],
  ['M000355', 'Mitch McConnell', 'risaa-2024-senate-passage', 'yea'],
]
for (const [bioguide, name, slug, expected] of GOLDEN) {
  const row = db
    .prepare(`
      SELECT v.position FROM votes v
      JOIN people p   ON p.id = v.person_id
      JOIN measures m ON m.id = v.measure_id
      WHERE p.bioguide_id = ? AND m.slug = ?
    `)
    .get(bioguide, slug) as { position: string } | undefined
  check(`${name} on ${slug}`, row?.position, expected)
}

// ---------------------------------------------------------------------------
console.log('\nDirection logic')
// ---------------------------------------------------------------------------
// The four best-known privacy hawks, across both parties and both chambers.
// If the pro/anti direction were inverted anywhere, these would flip to red.
for (const [bioguide, name] of [
  ['P000603', 'Rand Paul'],
  ['W000779', 'Ron Wyden'],
  ['M001184', 'Thomas Massie'],
  ['L000397', 'Zoe Lofgren'],
] as const) {
  const r = db
    .prepare(`SELECT r.grade FROM ratings r JOIN people p ON p.id = r.person_id WHERE p.bioguide_id = ?`)
    .get(bioguide) as { grade: string } | undefined
  check(`${name} grades green`, r?.grade, 'green')
}

// A delegate must never be marked as having declined a vote they may not cast.
const delegatesDeclined = db
  .prepare(`
    SELECT COUNT(*) n FROM ratings r JOIN people p ON p.id = r.person_id
    WHERE p.is_voting_member = 0 AND r.grade = 'gray_declined'
  `)
  .get() as { n: number }
check('no non-voting delegate marked "declined"', delegatesDeclined.n, 0)

// ---------------------------------------------------------------------------
console.log('\nCoverage guardrails')
// ---------------------------------------------------------------------------
// Catch an upstream format change that silently empties a table.
const counts = {
  people: (db.prepare('SELECT COUNT(*) n FROM people').get() as { n: number }).n,
  measures: (db.prepare('SELECT COUNT(*) n FROM measures').get() as { n: number }).n,
  votes: (db.prepare('SELECT COUNT(*) n FROM votes').get() as { n: number }).n,
  ratings: (db.prepare('SELECT COUNT(*) n FROM ratings').get() as { n: number }).n,
  evidence: (db.prepare('SELECT COUNT(*) n FROM evidence').get() as { n: number }).n,
  orgs: (db.prepare('SELECT COUNT(*) n FROM orgs').get() as { n: number }).n,
}
checkAtLeast('people', counts.people, 530)
checkAtLeast('measures', counts.measures, 8)
checkAtLeast('votes', counts.votes, 2000)
checkAtLeast('ratings', counts.ratings, 530)
checkAtLeast('evidence', counts.evidence, 8)
checkAtLeast('orgs', counts.orgs, 20)

// Every senator should have a Senate vote record or a documented reason not to.
const sensWithoutVotes = db
  .prepare(`
    SELECT COUNT(*) n FROM people p
    WHERE p.office = 'sen'
      AND p.term_start < '2024-04-19'
      AND NOT EXISTS (SELECT 1 FROM votes v WHERE v.person_id = p.id)
  `)
  .get() as { n: number }
check('every senator seated before the 2024 vote has a vote record', sensWithoutVotes.n, 0)

// ---------------------------------------------------------------------------
console.log('\nEvidence discipline')
// ---------------------------------------------------------------------------
// The core promise: no claim without a receipt. These are schema-enforced, so a
// nonzero result means the constraint has been weakened.
for (const table of ['votes', 'actions', 'contracts', 'deployments', 'contributions']) {
  const orphan = db
    .prepare(`SELECT COUNT(*) n FROM ${table} t LEFT JOIN evidence e ON e.id = t.evidence_id WHERE e.id IS NULL`)
    .get() as { n: number }
  check(`${table}: every row resolves to evidence`, orphan.n, 0)
}

const badTier = db.prepare('SELECT COUNT(*) n FROM evidence WHERE tier NOT IN (1,2,3)').get() as { n: number }
check('evidence tiers in range', badTier.n, 0)

// The rule that keeps this defensible: a green or red badge requires tier 1 or 2.
const softGrade = db
  .prepare(`SELECT COUNT(*) n FROM ratings WHERE grade IN ('green','red','mixed') AND (best_tier IS NULL OR best_tier > 2)`)
  .get() as { n: number }
check('no green/red/mixed grade rests on tier-3 evidence alone', softGrade.n, 0)

// Constraint is live, not just declared.
checks++
try {
  db.prepare(
    `INSERT INTO actions (id, person_id, topic, stance, kind, summary, evidence_id)
     VALUES ('__t','__t','surveillance','pro_surveillance','statement','test', NULL)`,
  ).run()
  failures++
  console.error('  FAIL  unsourced claim was accepted — the evidence constraint is not enforced')
} catch {
  console.log('  ok    unsourced claim is rejected by the database')
}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`)
db.close()
if (failures > 0) {
  console.error(`${failures} FAILED`)
  process.exit(1)
}
