'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Grade, Person } from '@/lib/types'
import { GradeBadge } from './GradeBadge'
import { GRADE_RANK, districtLabel, partyLetter } from '@/lib/grades'

const FILTERS: { key: Grade | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'red', label: 'For surveillance' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'green', label: 'Against' },
  { key: 'gray_declined', label: 'Abstained' },
  { key: 'gray_no_record', label: 'No record' },
]

export function CongressTable({ people }: { people: Person[] }) {
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState<Grade | 'all'>('all')
  const [chamber, setChamber] = useState<'all' | 'sen' | 'rep'>('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => (grade === 'all' ? true : p.grade === grade))
      .filter((p) => (chamber === 'all' ? true : p.office === chamber))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.state.toLowerCase() === q ||
          districtLabel(p).toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          GRADE_RANK[a.grade] - GRADE_RANK[b.grade] ||
          a.state.localeCompare(b.state) ||
          a.name.localeCompare(b.name),
      )
  }, [people, query, grade, chamber])

  return (
    <>
      <div className="lookup" style={{ margin: '1.5rem 0 .75rem' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or state (e.g. Massie, or TX)"
          aria-label="Search members"
        />
      </div>

      <div className="pill-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="small"
            onClick={() => setGrade(f.key)}
            style={
              grade === f.key
                ? { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
        <span style={{ width: '1rem' }} />
        {(['all', 'sen', 'rep'] as const).map((c) => (
          <button
            key={c}
            className="small"
            onClick={() => setChamber(c)}
            style={
              chamber === c
                ? { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' }
                : undefined
            }
          >
            {c === 'all' ? 'Both chambers' : c === 'sen' ? 'Senate' : 'House'}
          </button>
        ))}
      </div>

      <p className="faint">{rows.length} members</p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Rating</th>
              <th>Name</th>
              <th>Seat</th>
              <th>For</th>
              <th>Against</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.slug}>
                <td><GradeBadge grade={p.grade} short /></td>
                <td><Link href={`/person/${p.slug}`}>{p.name}</Link></td>
                <td className="mono">
                  {partyLetter(p.party)}-{districtLabel(p)}
                </td>
                <td className="mono">{p.pro || ''}</td>
                <td className="mono">{p.anti || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="muted">No members match that filter.</p>}
    </>
  )
}
