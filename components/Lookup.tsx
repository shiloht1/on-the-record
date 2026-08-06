'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  lookupDistricts,
  lookupZip,
  isBareZip,
  type DistrictResult,
  type ZipResult,
} from '@/lib/geocode'
import type { Measure, Person } from '@/lib/types'
import { GradeBadge } from './GradeBadge'
import { districtLabel, officeTitle, partyLetter, GRADE_RANK } from '@/lib/grades'

/**
 * Address lookup and results, on one page.
 *
 * Deliberately not a separate /you route: navigating would mean passing the
 * address between pages, and the obvious way to do that is a query string. The
 * address must never appear in a URL, so it never leaves this component's state.
 */
export function Lookup({
  people,
  byOcd,
}: {
  people: Person[]
  measures: Measure[]
  byOcd: Record<string, string[]>
}) {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DistrictResult | null>(null)
  const [zipResult, setZipResult] = useState<ZipResult | null>(null)

  const bySlug = new Map(people.map((p) => [p.slug, p]))
  const resolve = (ocds: (string | null)[]) =>
    ocds
      .filter((o): o is string => Boolean(o))
      .flatMap((o) => byOcd[o] ?? [])
      .map((slug) => bySlug.get(slug))
      .filter((p): p is Person => Boolean(p))
      .sort(
        (a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.name.localeCompare(b.name),
      )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = address.trim()
    if (!value) return

    setStatus('loading')
    setError(null)
    setResult(null)
    setZipResult(null)

    try {
      if (isBareZip(value)) {
        setZipResult(await lookupZip(value))
      } else {
        setResult(await lookupDistricts(value))
      }
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.')
      setStatus('error')
    }
  }

  const senators = zipResult ? resolve([zipResult.stateOcd]) : []
  const zipReps = zipResult ? resolve(zipResult.cdOcds) : []
  const addressMatched = result
    ? resolve([result.ocdIds.state, result.ocdIds.cd])
    : []

  // A ZIP always pins the state exactly, so senators are certain even when the
  // House seat is not.
  const ambiguous = zipResult ? zipResult.districts.length > 1 : false
  const vacant = zipResult ? zipResult.districts.length > zipReps.length : false

  return (
    <>
      <form className="lookup" onSubmit={submit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address, or ZIP code"
          aria-label="Your address or ZIP code"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'Looking up…' : 'Find my representatives'}
        </button>
      </form>

      <p className="privacy-note">
        Your address goes from your browser straight to the U.S. Census Bureau and nowhere
        else. It is never sent to this site, never stored, and never put in a link. This
        site has no server to log it — it is static files. You can verify that in your
        browser&rsquo;s network inspector.
      </p>

      {isBareZip(address) && status === 'idle' && (
        <p className="faint" style={{ marginTop: '.6rem' }}>
          A ZIP works, and always identifies your senators exactly. But about one ZIP in
          five spans more than one House district — a street address gets that exact too.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {status === 'done' && (result || zipResult) && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>Your representatives in Congress</h2>

          {result && (
            <p className="faint">
              Matched to {result.matchedAddress}
              {result.congressionalDistrict &&
                ` · ${result.state}-${result.congressionalDistrict}`}
              {result.place && ` · ${result.place}`}
            </p>
          )}

          {zipResult && (
            <p className="faint">
              ZIP {zipResult.zip} · {zipResult.state} ·{' '}
              {ambiguous
                ? `spans ${zipResult.districts.length} House districts (${zipResult.districts
                    .map((d) => `${zipResult.state}-${d}`)
                    .join(', ')})`
                : `${zipResult.state}-${zipResult.districts[0]}`}
            </p>
          )}

          {ambiguous && (
            <div className="callout">
              <p>
                <strong>This ZIP covers more than one House district.</strong> Both of your
                senators below are exact — a ZIP always pins the state. The
                representatives below are every possibility for this ZIP, and only one of
                them is actually yours. Enter your street address to find out which.
              </p>
            </div>
          )}

          {vacant && (
            <div className="callout">
              <p>
                <strong>One of the House seats covering this ZIP is currently vacant.</strong>{' '}
                A vacancy means a special election, which is usually the cheapest moment to
                get a commitment on the record from whoever wants the seat.
              </p>
            </div>
          )}

          <PersonCards people={result ? addressMatched : [...senators, ...zipReps]} />

          {result && (result.stateUpperDistrict || result.stateLowerDistrict) && (
            <div className="callout">
              <p>
                <strong>Your state legislature.</strong> You are in{' '}
                {result.stateUpperDistrict && (
                  <>state senate district {result.stateUpperDistrict}</>
                )}
                {result.stateUpperDistrict && result.stateLowerDistrict && ' and '}
                {result.stateLowerDistrict && (
                  <>state house district {result.stateLowerDistrict}</>
                )}
                {result.county && <>, in {result.county}</>}. State legislators and city
                councils are where camera contracts are actually approved. That layer is
                being built next — the district numbers are here so you can look them up
                yourself in the meantime.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  )
}

function PersonCards({ people }: { people: Person[] }) {
  if (people.length === 0) {
    return (
      <div className="error">
        We resolved your district but matched no members. That is a bug — please report it.
      </div>
    )
  }
  return (
    <div className="cards">
      {people.map((p) => (
        <article className="card" key={p.slug}>
          <div className="card-top">
            <div>
              <h3>
                <Link href={`/person/${p.slug}`}>{p.name}</Link>
              </h3>
              <div className="role">
                {officeTitle(p)} · {partyLetter(p.party)}-{districtLabel(p)}
              </div>
            </div>
            <GradeBadge grade={p.grade} short />
          </div>

          <p className="rationale">{p.rationale}</p>

          <div className="actions">
            <Link className="btn small primary" href={`/person/${p.slug}#contact`}>
              Contact them
            </Link>
            <Link className="btn small" href={`/person/${p.slug}`}>
              See their votes
            </Link>
          </div>
        </article>
      ))}
    </div>
  )
}
