import Database from 'better-sqlite3'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const ROOT = join(import.meta.dirname, '..', '..')
export const DB_PATH = join(ROOT, 'data', 'surveillance.db')
export const CACHE_DIR = join(ROOT, 'data', 'cache')
export const CURATED_DIR = join(ROOT, 'data', 'curated')
export const GENERATED_DIR = join(ROOT, 'data', 'generated')

export type DB = Database.Database

export function openDb(path = DB_PATH): DB {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('foreign_keys = ON')
  return db
}

export function createDb(path = DB_PATH): DB {
  const db = openDb(path)
  const schema = readFileSync(join(ROOT, 'pipeline', 'schema.sql'), 'utf8')
  db.exec(schema)
  return db
}

/**
 * Deterministic IDs. Rebuilding from the same inputs must produce the same
 * database, so that a `git diff` on data/surveillance.db reflects real changes
 * in the record rather than build noise. That auditability is the whole point
 * of committing the database.
 */
export function id(...parts: (string | number | undefined | null)[]): string {
  return createHash('sha1')
    .update(parts.map((p) => String(p ?? '')).join(' '))
    .digest('hex')
    .slice(0, 16)
}

// Written via the RegExp constructor so the combining-mark range stays as
// readable escapes rather than invisible characters in the source.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
