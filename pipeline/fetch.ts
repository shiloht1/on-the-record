/**
 * Download raw upstream sources into data/cache/.
 *
 * Kept separate from build.ts so that rebuilding the database (and therefore
 * re-deriving every rating) never requires network access. Run `npm run
 * data:fetch` when you want fresh upstream data; run `npm run data:build` as
 * often as you like.
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE_DIR } from './lib/db.ts'

const CONGRESSES = [118, 119]

interface Source {
  name: string
  url: string
  file: string
}

const SOURCES: Source[] = [
  {
    name: 'congress-legislators (current)',
    url: 'https://unitedstates.github.io/congress-legislators/legislators-current.json',
    file: 'legislators-current.json',
  },
  {
    name: 'voteview rollcalls (all)',
    url: 'https://voteview.com/static/data/out/rollcalls/HSall_rollcalls.csv',
    file: 'HSall_rollcalls.csv',
  },
  {
    // ZIP -> congressional district. Needed because the Census geocoder returns
    // zero matches for a bare ZIP — it requires a street address — and people
    // will type ZIPs.
    //
    // LICENSING — do not "upgrade" this to zccd_hud.csv in the same repo.
    // zccd.csv is derived from Census block-equivalency and ZCTA relationship
    // files, which are United States Government Works with no copyright.
    // zccd_hud.csv is derived from the HUD USPS crosswalk, which is licensed
    // ONLY to government entities and nonprofits working within HUD's stated
    // purpose. It is marginally more complete and using it here would be a
    // licence violation.
    name: 'ZCTA to congressional district crosswalk (Census-derived)',
    url: 'https://raw.githubusercontent.com/OpenSourceActivismTech/us-zipcodes-congress/master/zccd.csv',
    file: 'zccd.csv',
  },
]

// Per-congress files rather than HSall_votes.csv, which is 668 MB. Same schema,
// ~1000x less bandwidth.
for (const c of CONGRESSES) {
  for (const chamber of ['H', 'S']) {
    SOURCES.push({
      name: `voteview ${chamber}${c} votes`,
      url: `https://voteview.com/static/data/out/votes/${chamber}${c}_votes.csv`,
      file: `${chamber}${c}_votes.csv`,
    })
    SOURCES.push({
      name: `voteview ${chamber}${c} members`,
      url: `https://voteview.com/static/data/out/members/${chamber}${c}_members.csv`,
      file: `${chamber}${c}_members.csv`,
    })
  }
}

const MAX_AGE_MS = 12 * 60 * 60 * 1000

async function fetchOne(src: Source, force: boolean): Promise<void> {
  const dest = join(CACHE_DIR, src.file)

  if (!force && existsSync(dest)) {
    const age = Date.now() - statSync(dest).mtimeMs
    if (age < MAX_AGE_MS) {
      console.log(`  cached   ${src.name}`)
      return
    }
  }

  const res = await fetch(src.url, {
    signal: AbortSignal.timeout(300_000),
    headers: { 'User-Agent': 'surveillance-accountability/0.1 (public-record research)' },
  })
  if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status} from ${src.url}`)

  const body = Buffer.from(await res.arrayBuffer())
  if (body.length === 0) throw new Error(`${src.name}: empty response`)

  writeFileSync(dest, body)
  const mb = (body.length / 1024 / 1024).toFixed(1)
  console.log(`  fetched  ${src.name} (${mb} MB)`)
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true })
  const force = process.argv.includes('--force')

  console.log(`Fetching ${SOURCES.length} sources into data/cache/`)
  for (const src of SOURCES) {
    await fetchOne(src, force)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error('fetch failed:', err.message)
  process.exit(1)
})
