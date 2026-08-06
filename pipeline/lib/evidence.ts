import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CURATED_DIR, id, type DB } from './db.ts'
import type { EvidenceInput } from './types.ts'

/**
 * Wayback lookups are cached to a committed file so that builds are
 * reproducible offline and we do not re-hammer archive.org on every run.
 */
const CACHE_PATH = join(CURATED_DIR, 'archive-cache.json')

type ArchiveCache = Record<string, { archive_url: string | null; checked: string }>

function loadCache(): ArchiveCache {
  if (!existsSync(CACHE_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as ArchiveCache
  } catch {
    return {}
  }
}

let cache = loadCache()
let cacheDirty = false

export function saveArchiveCache(): void {
  if (!cacheDirty) return
  mkdirSync(CURATED_DIR, { recursive: true })
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(CACHE_PATH, JSON.stringify(sorted, null, 2) + '\n')
  cacheDirty = false
}

/**
 * Find (or request) a Wayback snapshot.
 *
 * Municipal portals and clerk sites rewrite URLs constantly. An unarchived
 * citation eventually becomes a dead link, and a dead link is indistinguishable
 * to a skeptical reader from a fabricated one — so every source we cite should
 * have a snapshot behind it.
 *
 * Network access is opt-in via ARCHIVE=1 so ordinary builds stay fast and
 * offline-capable.
 */
export async function resolveArchiveUrl(url: string): Promise<string | null> {
  if (url in cache) return cache[url].archive_url

  if (process.env.ARCHIVE !== '1') return null

  let archiveUrl: string | null = null
  try {
    const res = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(20_000) },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        archived_snapshots?: { closest?: { available?: boolean; url?: string } }
      }
      const closest = data.archived_snapshots?.closest
      if (closest?.available && closest.url) {
        archiveUrl = closest.url.replace(/^http:/, 'https:')
      }
    }
  } catch {
    // Best-effort. A failed archive lookup must never fail the build — it just
    // leaves archive_url null, which the UI renders as "snapshot pending".
  }

  if (!archiveUrl) {
    try {
      const res = await fetch(`https://web.archive.org/save/${url}`, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(45_000),
      })
      if (res.ok && res.url.includes('/web/')) archiveUrl = res.url
    } catch {
      /* see above */
    }
  }

  cache[url] = { archive_url: archiveUrl, checked: new Date().toISOString() }
  cacheDirty = true
  return archiveUrl
}

const insertStmtCache = new WeakMap<DB, ReturnType<DB['prepare']>>()

/**
 * Insert an evidence row and return its id. Idempotent on (url, kind).
 */
export function putEvidence(db: DB, input: EvidenceInput, capturedAt: string): string {
  let stmt = insertStmtCache.get(db)
  if (!stmt) {
    stmt = db.prepare(`
      INSERT INTO evidence (id, url, archive_url, publisher, date_published,
                            date_captured, excerpt, kind, tier, added_by)
      VALUES (@id, @url, @archive_url, @publisher, @date_published,
              @date_captured, @excerpt, @kind, @tier, @added_by)
      ON CONFLICT(id) DO UPDATE SET
        archive_url = COALESCE(excluded.archive_url, evidence.archive_url),
        excerpt     = COALESCE(excluded.excerpt, evidence.excerpt)
    `)
    insertStmtCache.set(db, stmt)
  }

  const evidenceId = id('evidence', input.url, input.kind)
  stmt.run({
    id: evidenceId,
    url: input.url,
    archive_url: input.archive_url ?? cache[input.url]?.archive_url ?? null,
    publisher: input.publisher,
    date_published: input.date_published ?? null,
    date_captured: capturedAt,
    excerpt: input.excerpt?.trim() ?? null,
    kind: input.kind,
    tier: input.tier,
    added_by: input.added_by ?? 'pipeline',
  })
  return evidenceId
}
