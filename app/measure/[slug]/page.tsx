import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBundle } from '@/lib/data'
import { formatDate, partyLetter, districtLabel } from '@/lib/grades'

export function generateStaticParams() {
  return getBundle().measures.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = getBundle().measures.find((x) => x.slug === slug)
  return m ? { title: m.title, description: m.description ?? undefined } : {}
}

export default async function MeasurePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bundle = getBundle()
  const measure = bundle.measures.find((m) => m.slug === slug)
  if (!measure) notFound()

  const voters = bundle.people
    .map((p) => ({ p, vote: p.votes.find((v) => v.m === measure.slug) }))
    .filter((x) => x.vote)

  const pro = voters.filter((x) => x.vote!.p === measure.pro_surveillance_position)
  const anti = voters.filter(
    (x) => x.vote!.p !== measure.pro_surveillance_position && ['yea', 'nay'].includes(x.vote!.p),
  )
  const declined = voters.filter((x) => ['present', 'not_voting'].includes(x.vote!.p))

  const yesMeans = measure.pro_surveillance_position === 'yea'

  return (
    <div className="wrap narrow">
      <Link className="back" href="/measures">← All tracked votes</Link>

      <h1 style={{ marginTop: '.5rem' }}>{measure.title}</h1>
      <p className="muted">
        {measure.chamber} · {measure.identifier} · {formatDate(measure.date)}
        {measure.clerk_rollnumber != null && <> · roll call {measure.clerk_rollnumber}</>}
      </p>

      <div className="pill-row">
        <span className="pill">{measure.result}</span>
        <span className="pill">
          {measure.yea_count} yea · {measure.nay_count} nay
        </span>
        {measure.question && <span className="pill">{measure.question}</span>}
      </div>

      {measure.description && (
        <p style={{ fontSize: '1.05rem' }}>{measure.description}</p>
      )}

      <div className="callout">
        <p>
          <strong>How this vote is scored.</strong> A <em>{yesMeans ? 'yes' : 'no'}</em>{' '}
          vote on this measure counts as supporting surveillance;{' '}
          <em>{yesMeans ? 'no' : 'yes'}</em> counts as opposing it.
          {!yesMeans && (
            <>
              {' '}
              This one runs opposite to intuition: the measure <em>restricts</em>{' '}
              surveillance, so voting yes is a vote against it.
            </>
          )}
        </p>
        {measure.notes && <p style={{ marginTop: '.7rem' }}>{measure.notes}</p>}
      </div>

      <p className="source">
        Source: <a href={measure.url} target="_blank" rel="noreferrer noopener">{measure.publisher}</a>
        {measure.archive_url && (
          <>
            {' · '}
            <a href={measure.archive_url} target="_blank" rel="noreferrer noopener">
              archived copy
            </a>
          </>
        )}
      </p>

      <h2>How current members voted</h2>
      <p className="faint">
        {voters.length} of the members who cast a vote are still in office. Members who
        have since left are not listed.
      </p>

      <VoterList title={`Voted for surveillance (${pro.length})`} rows={pro} tone="pro" />
      <VoterList title={`Voted against surveillance (${anti.length})`} rows={anti} tone="anti" />
      {declined.length > 0 && (
        <VoterList title={`Did not vote (${declined.length})`} rows={declined} tone="declined" />
      )}
    </div>
  )
}

function VoterList({
  title,
  rows,
  tone,
}: {
  title: string
  rows: { p: any; vote: any }[]
  tone: 'pro' | 'anti' | 'declined'
}) {
  if (rows.length === 0) return null
  return (
    <details>
      <summary>
        <span className={`stance ${tone}`}>{title}</span>
      </summary>
      <div className="table-scroll">
        <table>
          <tbody>
            {rows
              .sort((a, b) => a.p.state.localeCompare(b.p.state) || a.p.name.localeCompare(b.p.name))
              .map(({ p }) => (
                <tr key={p.slug}>
                  <td>
                    <Link href={`/person/${p.slug}`}>{p.name}</Link>
                  </td>
                  <td className="mono">
                    {partyLetter(p.party)}-{districtLabel(p)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
