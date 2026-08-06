import Link from 'next/link'
import { getBundle } from '@/lib/data'
import { formatDate } from '@/lib/grades'

export const metadata = {
  title: 'Tracked votes',
  description:
    'The recorded congressional votes on surveillance authority that produce every rating on this site.',
}

export default function MeasuresPage() {
  const bundle = getBundle()
  const measures = [...bundle.measures].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>Tracked votes</h1>
      <p className="muted">
        Every rating on this site is built from these {measures.length} recorded votes.
        Nothing else feeds a grade. Each one links to the official record.
      </p>

      <ul className="votes">
        {measures.map((m) => (
          <li key={m.slug}>
            <div className="vote-head">
              <span className="vote-title">
                <Link href={`/measure/${m.slug}`}>{m.title}</Link>
              </span>
            </div>
            <div className="vote-meta">
              {formatDate(m.date)} · {m.chamber} · {m.identifier} · {m.result} ·{' '}
              {m.yea_count}–{m.nay_count}
            </div>
            <div className="faint">
              A <strong>{m.pro_surveillance_position === 'yea' ? 'yes' : 'no'}</strong> vote
              counts as supporting surveillance.
            </div>
          </li>
        ))}
      </ul>

      <div className="callout">
        <p>
          <strong>What we deliberately left out.</strong> Several surveillance-related roll
          calls are excluded on purpose — procedural votes, votes whose direction is
          genuinely ambiguous, and one amendment so maximalist that scoring it would have
          marked 81 senators red off a single 11–81 vote. A scorecard that counts every
          rejected amendment against everyone turns the whole chamber red and stops meaning
          anything. The full list of exclusions and reasons is in the repository at{' '}
          <span className="mono">data/curated/measures/federal/EXCLUDED.md</span>.
        </p>
      </div>
    </div>
  )
}
