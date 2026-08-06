import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Bundle } from './types'

/**
 * Build-time data access. Server side only — the browser fetches
 * /data/bundle.json instead. Nothing here runs at request time because the
 * whole site is a static export.
 */
let cached: Bundle | null = null

export function getBundle(): Bundle {
  if (!cached) {
    const path = join(process.cwd(), 'public', 'data', 'bundle.json')
    cached = JSON.parse(readFileSync(path, 'utf8')) as Bundle
  }
  return cached
}
