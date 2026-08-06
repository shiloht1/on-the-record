import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { CURATED_DIR } from '../lib/db.ts'
import type { CuratedMeasure, CuratedVendor } from '../lib/types.ts'

/**
 * Validation is deliberately strict and fails the build. The curated layer is
 * where a human asserts "this vote counts, and a YES means X" — a typo there
 * flips a rating from green to red, which is the worst failure this project can
 * have. Better a broken build than a confident lie.
 */
function requireField<T>(value: T | undefined | null, field: string, file: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${file}: missing required field "${field}"`)
  }
  return value
}

export function loadMeasures(): CuratedMeasure[] {
  const dirs = [
    join(CURATED_DIR, 'measures', 'federal'),
    join(CURATED_DIR, 'measures', 'state'),
    join(CURATED_DIR, 'measures', 'local'),
  ]

  const measures: CuratedMeasure[] = []
  const seen = new Set<string>()

  for (const dir of dirs) {
    if (!existsSync(dir)) continue

    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue

      const path = join(dir, file)
      // CORE_SCHEMA, not the default: js-yaml's default schema silently converts
      // an unquoted 2026-04-30 into a Date parsed as UTC midnight, which in a
      // US timezone stringifies back as 2026-04-29. Every citation date would be
      // one day off from the official record it points at.
      const m = yaml.load(readFileSync(path, 'utf8'), {
        schema: yaml.CORE_SCHEMA,
      }) as CuratedMeasure

      requireField(m.slug, 'slug', file)
      requireField(m.level, 'level', file)
      requireField(m.identifier, 'identifier', file)
      requireField(m.date, 'date', file)
      requireField(m.title, 'title', file)
      requireField(m.evidence, 'evidence', file)
      requireField(m.evidence.url, 'evidence.url', file)
      requireField(m.evidence.publisher, 'evidence.publisher', file)
      requireField(m.evidence.kind, 'evidence.kind', file)
      requireField(m.evidence.tier, 'evidence.tier', file)

      // The single most consequential field in the repo.
      if (m.pro_surveillance_position !== 'yea' && m.pro_surveillance_position !== 'nay') {
        throw new Error(
          `${file}: pro_surveillance_position must be exactly "yea" or "nay", got ` +
            `${JSON.stringify(m.pro_surveillance_position)}. This determines which ` +
            `way every member's vote is scored — do not guess it from the title.`,
        )
      }

      if (seen.has(m.slug)) throw new Error(`${file}: duplicate measure slug "${m.slug}"`)
      seen.add(m.slug)

      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
        throw new Error(`${file}: date must be ISO YYYY-MM-DD, got "${m.date}"`)
      }

      measures.push(m)
    }
  }

  return measures
}

export function loadVendors(): CuratedVendor[] {
  const path = join(CURATED_DIR, 'vendors.yml')
  if (!existsSync(path)) return []

  const doc = yaml.load(readFileSync(path, 'utf8'), {
    schema: yaml.CORE_SCHEMA,
  }) as { vendors: CuratedVendor[] }
  const vendors = doc?.vendors ?? []

  const slugs = new Set(vendors.map((v) => v.slug))
  for (const v of vendors) {
    requireField(v.slug, 'slug', 'vendors.yml')
    requireField(v.name, 'name', 'vendors.yml')
    if (v.parent && !slugs.has(v.parent)) {
      throw new Error(`vendors.yml: "${v.slug}" has unknown parent "${v.parent}"`)
    }
  }

  return vendors
}
