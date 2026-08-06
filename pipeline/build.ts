/**
 * Build data/surveillance.db from data/cache/ (upstream) and data/curated/
 * (editorial). Deterministic and offline — no network access required.
 */
import { rmSync, existsSync } from 'node:fs'
import { createDb, id, DB_PATH, type DB } from './lib/db.ts'
import { putEvidence, resolveArchiveUrl, saveArchiveCache } from './lib/evidence.ts'
import { loadLegislators } from './sources/congress-legislators.ts'
import { loadMeasures, loadVendors } from './sources/curated.ts'
import { loadMemberIndex, loadVotesFor, loadRollcalls } from './sources/voteview.ts'
import { rebuildRatings } from './rate.ts'

const CONGRESSES = [118, 119]

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam',
  VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands',
}

function insertJurisdictions(db: DB, legislators: ReturnType<typeof loadLegislators>) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jurisdictions (ocd_id, level, name, parent_ocd_id, state)
    VALUES (?, ?, ?, ?, ?)
  `)

  stmt.run('ocd-division/country:us', 'nation', 'United States', null, null)

  const states = new Set(legislators.map((l) => l.state))
  for (const st of states) {
    stmt.run(
      `ocd-division/country:us/state:${st.toLowerCase()}`,
      'state',
      STATE_NAMES[st] ?? st,
      'ocd-division/country:us',
      st,
    )
  }

  for (const l of legislators) {
    if (l.office !== 'rep') continue
    const stateOcd = `ocd-division/country:us/state:${l.state.toLowerCase()}`
    const atLarge = l.district === '0'
    stmt.run(
      l.ocd_id,
      'cd',
      atLarge
        ? `${STATE_NAMES[l.state] ?? l.state} at-large congressional district`
        : `${STATE_NAMES[l.state] ?? l.state} ${l.district}th congressional district`,
      stateOcd,
      l.state,
    )
  }
}

function insertPeople(db: DB, legislators: ReturnType<typeof loadLegislators>) {
  const stmt = db.prepare(`
    INSERT INTO people (id, slug, name, level, party, ocd_id, office, state, district,
                        bioguide_id, icpsr, fec_candidate_id, phone, contact_form,
                        website, term_start, term_end, next_election_date,
                        in_office, is_voting_member)
    VALUES (@id, @slug, @name, 'federal', @party, @ocd_id, @office, @state, @district,
            @bioguide_id, @icpsr, @fec_candidate_id, @phone, @contact_form,
            @website, @term_start, @term_end, @next_election_date, 1, @is_voting_member)
  `)

  const run = db.transaction(() => {
    for (const l of legislators) {
      stmt.run({
        id: id('person', l.bioguide_id),
        slug: l.slug,
        name: l.name,
        party: l.party,
        ocd_id: l.ocd_id,
        office: l.office,
        state: l.state,
        district: l.district,
        bioguide_id: l.bioguide_id,
        icpsr: l.icpsr,
        fec_candidate_id: l.fec_candidate_id,
        phone: l.phone,
        contact_form: l.contact_form,
        website: l.website,
        term_start: l.term_start,
        term_end: l.term_end,
        next_election_date: l.next_election_date,
        is_voting_member: l.is_voting_member ? 1 : 0,
      })
    }
  })
  run()
}

function insertVendors(db: DB) {
  const vendors = loadVendors()
  const stmt = db.prepare(`
    INSERT INTO orgs (id, slug, name, kind, parent_org_id, ticker, hq, summary, website)
    VALUES (@id, @slug, @name, @kind, @parent_org_id, @ticker, @hq, @summary, @website)
  `)

  // Two passes so a subsidiary can reference a parent defined after it.
  const run = db.transaction(() => {
    for (const v of vendors) {
      stmt.run({
        id: id('org', v.slug),
        slug: v.slug,
        name: v.name,
        kind: v.kind,
        parent_org_id: null,
        ticker: v.ticker ?? null,
        hq: v.hq ?? null,
        summary: v.summary?.trim() ?? null,
        website: v.website ?? null,
      })
    }
    const setParent = db.prepare('UPDATE orgs SET parent_org_id = ? WHERE id = ?')
    for (const v of vendors) {
      if (v.parent) setParent.run(id('org', v.parent), id('org', v.slug))
    }
  })
  run()

  return vendors.length
}

async function main() {
  const capturedAt = new Date().toISOString()

  if (existsSync(DB_PATH)) {
    rmSync(DB_PATH, { force: true })
    rmSync(`${DB_PATH}-wal`, { force: true })
    rmSync(`${DB_PATH}-shm`, { force: true })
  }
  const db = createDb()

  console.log('Loading congress-legislators...')
  const legislators = loadLegislators()
  insertJurisdictions(db, legislators)
  insertPeople(db, legislators)
  console.log(`  ${legislators.length} current members of Congress`)

  const vendorCount = insertVendors(db)
  console.log(`  ${vendorCount} vendors`)

  console.log('Loading curated measures...')
  const measures = loadMeasures()
  console.log(`  ${measures.length} scored measures`)

  console.log('Loading Voteview member index...')
  const memberIndex = loadMemberIndex(CONGRESSES)
  const icpsrToPerson = new Map<number, string>()
  const bioguideToPerson = new Map(
    legislators.map((l) => [l.bioguide_id, id('person', l.bioguide_id)]),
  )
  for (const [icpsr, m] of memberIndex) {
    const personId = bioguideToPerson.get(m.bioguide_id)
    if (personId) icpsrToPerson.set(icpsr, personId)
  }
  console.log(
    `  ${memberIndex.size} Voteview members, ${icpsrToPerson.size} matched to current members`,
  )

  const rollcalls = loadRollcalls(CONGRESSES)

  // Archive every cited URL (opt-in via ARCHIVE=1).
  for (const m of measures) {
    m.evidence.archive_url =
      (await resolveArchiveUrl(m.evidence.url)) ?? m.evidence.archive_url
  }
  saveArchiveCache()

  const insertMeasure = db.prepare(`
    INSERT INTO measures (id, slug, level, jurisdiction_ocd_id, chamber, congress,
                          session, identifier, rollnumber, clerk_rollnumber, date,
                          title, description, question, result, yea_count, nay_count,
                          pro_surveillance_position, topic, significance, notes,
                          evidence_id)
    VALUES (@id, @slug, @level, @jurisdiction_ocd_id, @chamber, @congress,
            @session, @identifier, @rollnumber, @clerk_rollnumber, @date,
            @title, @description, @question, @result, @yea_count, @nay_count,
            @pro_surveillance_position, @topic, @significance, @notes, @evidence_id)
  `)
  const insertVote = db.prepare(`
    INSERT OR REPLACE INTO votes (person_id, measure_id, position, evidence_id)
    VALUES (?, ?, ?, ?)
  `)

  const wanted = measures
    .filter((m) => m.congress && m.chamber && m.rollnumber)
    .map((m) => ({ congress: m.congress!, chamber: m.chamber!, rollnumber: m.rollnumber! }))

  console.log('Loading Voteview votes...')
  const votesByKey = loadVotesFor(wanted)

  let totalVotes = 0
  const run = db.transaction(() => {
    for (const m of measures) {
      const evidenceId = putEvidence(db, m.evidence, capturedAt)
      const measureId = id('measure', m.slug)

      // Cross-check the curated metadata against Voteview before trusting it.
      const key = `${m.congress}|${m.chamber}|${m.rollnumber}`
      const rc = rollcalls.get(key)
      if (m.rollnumber && !rc) {
        throw new Error(
          `${m.slug}: no Voteview rollcall found for ${key}. Check congress/chamber/rollnumber.`,
        )
      }
      if (rc) {
        if (m.clerk_rollnumber && Number(rc.clerk_rollnumber) !== m.clerk_rollnumber) {
          throw new Error(
            `${m.slug}: clerk_rollnumber mismatch — curated ${m.clerk_rollnumber}, ` +
              `Voteview ${rc.clerk_rollnumber}. One of them is wrong, and citing the ` +
              `wrong roll call number makes every claim on this measure uncheckable.`,
          )
        }
        if (rc.date !== m.date) {
          throw new Error(`${m.slug}: date mismatch — curated ${m.date}, Voteview ${rc.date}`)
        }
        if (m.yea_count !== undefined && Number(rc.yea_count) !== m.yea_count) {
          throw new Error(
            `${m.slug}: yea_count mismatch — curated ${m.yea_count}, Voteview ${rc.yea_count}`,
          )
        }
        if (m.nay_count !== undefined && Number(rc.nay_count) !== m.nay_count) {
          throw new Error(
            `${m.slug}: nay_count mismatch — curated ${m.nay_count}, Voteview ${rc.nay_count}`,
          )
        }
      }

      insertMeasure.run({
        id: measureId,
        slug: m.slug,
        level: m.level,
        jurisdiction_ocd_id: m.jurisdiction_ocd_id ?? null,
        chamber: m.chamber ?? null,
        congress: m.congress ?? null,
        session: m.session ?? null,
        identifier: m.identifier,
        rollnumber: m.rollnumber ?? null,
        clerk_rollnumber: m.clerk_rollnumber ?? null,
        date: m.date,
        title: m.title,
        description: m.description?.trim() ?? null,
        question: m.question ?? null,
        result: m.result ?? null,
        yea_count: m.yea_count ?? null,
        nay_count: m.nay_count ?? null,
        pro_surveillance_position: m.pro_surveillance_position,
        topic: m.topic ?? 'surveillance',
        significance: m.significance ?? 1,
        notes: m.notes?.trim() ?? null,
        evidence_id: evidenceId,
      })

      const cast = votesByKey.get(key) ?? []
      let matched = 0
      for (const v of cast) {
        const personId = icpsrToPerson.get(v.icpsr)
        // Members who have since left office are skipped: v1 rates only people
        // a visitor can currently contact or vote against.
        if (!personId) continue
        insertVote.run(personId, measureId, v.position, evidenceId)
        matched++
      }
      totalVotes += matched
      console.log(`  ${m.slug}: ${matched} of ${cast.length} voters still in office`)
    }
  })
  run()

  console.log('Computing ratings...')
  const rated = rebuildRatings(db)
  console.log(`  ${rated} ratings, from ${totalVotes} vote records`)

  const meta = db.prepare('INSERT OR REPLACE INTO build_meta (key, value) VALUES (?, ?)')
  meta.run('built_at', capturedAt)
  meta.run('congresses', CONGRESSES.join(','))
  meta.run('measure_count', String(measures.length))
  meta.run('person_count', String(legislators.length))

  const grades = db
    .prepare('SELECT grade, COUNT(*) n FROM ratings GROUP BY grade ORDER BY n DESC')
    .all() as { grade: string; n: number }[]
  console.log('\nGrade distribution:')
  for (const g of grades) console.log(`  ${g.grade.padEnd(16)} ${g.n}`)

  db.close()
  console.log(`\nWrote ${DB_PATH}`)
}

main().catch((err) => {
  console.error('\nBuild failed:', err.message)
  process.exit(1)
})
