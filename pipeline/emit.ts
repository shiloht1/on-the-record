/**
 * Emit JSON bundles the web app consumes.
 *
 * The app never opens the database at runtime. Everything ships as static JSON
 * so the whole site can be a static export — which is what makes the privacy
 * guarantee real: there is no server to log anything, not merely a server we
 * promise not to log with.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openDb, ROOT } from './lib/db.ts'
import { loadZipDistricts } from './sources/zip-districts.ts'

const PUBLIC_DATA = join(ROOT, 'public', 'data')

interface PersonOut {
  slug: string
  name: string
  party: string | null
  state: string
  district: string | null
  office: string
  ocd_id: string
  grade: string
  pro: number
  anti: number
  declined: number
  rationale: string
  phone: string | null
  contact_form: string | null
  website: string | null
  next_election: string | null
  is_voting_member: boolean
  votes: { m: string; p: string }[]
}

function main() {
  const db = openDb()
  mkdirSync(PUBLIC_DATA, { recursive: true })

  const people = db
    .prepare(`
      SELECT p.id, p.slug, p.name, p.party, p.state, p.district, p.office, p.ocd_id,
             p.phone, p.contact_form, p.website, p.next_election_date, p.is_voting_member,
             r.grade, r.pro_count, r.anti_count, r.declined_count, r.rationale
      FROM people p
      LEFT JOIN ratings r ON r.person_id = p.id
      WHERE p.in_office = 1
      ORDER BY p.state, p.office DESC, p.district
    `)
    .all() as any[]

  const votesByPerson = new Map<string, { m: string; p: string }[]>()
  for (const v of db
    .prepare(`
      SELECT v.person_id, m.slug, v.position
      FROM votes v JOIN measures m ON m.id = v.measure_id
      ORDER BY m.date DESC
    `)
    .all() as any[]) {
    let list = votesByPerson.get(v.person_id)
    if (!list) votesByPerson.set(v.person_id, (list = []))
    list.push({ m: v.slug, p: v.position })
  }

  const peopleOut: PersonOut[] = people.map((p) => ({
    slug: p.slug,
    name: p.name,
    party: p.party,
    state: p.state,
    district: p.district,
    office: p.office,
    ocd_id: p.ocd_id,
    grade: p.grade ?? 'gray_no_record',
    pro: p.pro_count ?? 0,
    anti: p.anti_count ?? 0,
    declined: p.declined_count ?? 0,
    rationale: p.rationale ?? '',
    phone: p.phone,
    contact_form: p.contact_form,
    website: p.website,
    next_election: p.next_election_date,
    is_voting_member: p.is_voting_member === 1,
    votes: votesByPerson.get(p.id) ?? [],
  }))

  const measures = db
    .prepare(`
      SELECT m.slug, m.title, m.description, m.date, m.chamber, m.identifier,
             m.clerk_rollnumber, m.question, m.result, m.yea_count, m.nay_count,
             m.pro_surveillance_position, m.significance, m.notes,
             e.url, e.archive_url, e.publisher, e.tier
      FROM measures m JOIN evidence e ON e.id = m.evidence_id
      ORDER BY m.date DESC
    `)
    .all() as any[]

  const orgs = db
    .prepare(`
      SELECT o.slug, o.name, o.kind, o.ticker, o.hq, o.summary, o.website,
             parent.slug AS parent_slug, parent.name AS parent_name
      FROM orgs o LEFT JOIN orgs parent ON parent.id = o.parent_org_id
      ORDER BY o.name
    `)
    .all() as any[]

  const builtAt =
    (db.prepare(`SELECT value FROM build_meta WHERE key = 'built_at'`).get() as any)?.value ?? null

  // Index by OCD-ID so an address lookup is a map hit, not a scan.
  const byOcd: Record<string, string[]> = {}
  for (const p of peopleOut) {
    ;(byOcd[p.ocd_id] ??= []).push(p.slug)
  }

  const bundle = { built_at: builtAt, people: peopleOut, measures, orgs, by_ocd: byOcd }
  const path = join(PUBLIC_DATA, 'bundle.json')
  writeFileSync(path, JSON.stringify(bundle))

  const kb = (JSON.stringify(bundle).length / 1024).toFixed(0)
  console.log(`Wrote public/data/bundle.json (${kb} KB)`)
  console.log(`  ${peopleOut.length} people, ${measures.length} measures, ${orgs.length} orgs`)

  // Separate file, lazy-loaded only when someone types a ZIP, so the common
  // street-address path never pays for it.
  const zips = loadZipDistricts()
  const zipPath = join(PUBLIC_DATA, 'zip-districts.json')
  writeFileSync(zipPath, JSON.stringify(zips))
  const multi = Object.values(zips).filter((v) => v.includes(',')).length
  console.log(
    `Wrote public/data/zip-districts.json (${(JSON.stringify(zips).length / 1024).toFixed(0)} KB)`,
  )
  console.log(
    `  ${Object.keys(zips).length} ZIPs, ${multi} spanning more than one district ` +
      `(${((100 * multi) / Object.keys(zips).length).toFixed(0)}%)`,
  )

  db.close()
}

main()
