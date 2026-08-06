import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { CACHE_DIR } from '../lib/db.ts'

/**
 * ZIP -> congressional district(s).
 *
 * Necessary because the Census geocoder returns no match at all for a bare ZIP,
 * and people type ZIPs. Two properties of this data drive the UI:
 *
 *  - About 22% of ZIPs span more than one congressional district, so a ZIP
 *    cannot silently resolve to one representative. The UI must disambiguate.
 *  - Some ZIPs (single-building and PO-box ZIPs, e.g. 10118) have no ZCTA at
 *    all and are simply absent. The UI must say so rather than show nothing.
 *
 * A ZIP always determines the state, so both senators are always exact even
 * when the House seat is not.
 */
export function loadZipDistricts(): Record<string, string> {
  const path = join(CACHE_DIR, 'zccd.csv')
  if (!existsSync(path)) {
    throw new Error('Missing zccd.csv in data/cache. Run: npm run data:fetch')
  }

  const rows = parse(readFileSync(path, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  }) as { state_abbr: string; zcta: string; cd: string }[]

  const byZip = new Map<string, { state: string; cds: Set<number> }>()
  for (const r of rows) {
    const zip = r.zcta?.trim()
    const state = r.state_abbr?.trim()
    if (!zip || !state) continue
    let entry = byZip.get(zip)
    if (!entry) byZip.set(zip, (entry = { state, cds: new Set() }))
    const cd = Number(r.cd)
    if (Number.isFinite(cd)) entry.cds.add(cd === 0 ? 1 : cd)
  }

  // Compact "CA:30,32,36" form — this file is ~34k entries and is lazy-loaded
  // only when someone actually types a ZIP.
  const out: Record<string, string> = {}
  for (const [zip, { state, cds }] of byZip) {
    out[zip] = `${state}:${[...cds].sort((a, b) => a - b).join(',')}`
  }
  return out
}
