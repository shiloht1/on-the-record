import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBundle } from '@/lib/data'
import { GradeBadge } from '@/components/GradeBadge'
import { ContactPanel } from '@/components/ContactPanel'
import {
  districtLabel,
  formatDate,
  officeTitle,
  partyLetter,
  voteStance,
} from '@/lib/grades'

export function generateStaticParams() {
  return getBundle().people.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getBundle().people.find((p) => p.slug === slug)
  if (!person) return {}
  return {
    title: `${person.name} — surveillance voting record`,
    description: person.rationale,
  }
}

const STANCE_LABEL = { pro: 'For surveillance', anti: 'Against surveillance', declined: 'Did not vote' }

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bundle = getBundle()
  const person = bundle.people.find((p) => p.slug === slug)
  if (!person) notFound()

  const measures = new Map(bundle.measures.map((m) => [m.slug, m]))
  const votes = person.votes
    .map((v) => ({ v, m: measures.get(v.m)! }))
    .filter((x) => x.m)
    .sort((a, b) => b.m.date.localeCompare(a.m.date))

  return (
    <div className="wrap narrow">
      <Link className="back" href="/congress">← All members</Link>

      <h1 style={{ marginTop: '.5rem' }}>{person.name}</h1>
      <p className="muted" style={{ fontSize: '1.05rem' }}>
        {officeTitle(person)} · {partyLetter(person.party)}-{districtLabel(person)}
      </p>

      <div style={{ margin: '1.25rem 0' }}>
        <GradeBadge grade={person.grade} />
      </div>

      <p style={{ fontSize: '1.05rem' }}>{person.rationale}</p>

      {person.next_election && (
        <p className="faint">
          Next scheduled election for this seat: {formatDate(person.next_election)}.
        </p>
      )}

      <h2>The record</h2>

      {votes.length === 0 ? (
        <p className="muted">
          No votes on tracked surveillance measures.{' '}
          {!person.is_voting_member &&
            'Members representing territories may not vote on final passage in the House.'}
        </p>
      ) : (
        <ul className="votes">
          {votes.map(({ v, m }) => {
            const stance = voteStance(v.p, m)
            return (
              <li key={m.slug}>
                <div className="vote-head">
                  <span className={`stance ${stance}`}>{STANCE_LABEL[stance]}</span>
                  <span className="vote-title">
                    <Link href={`/measure/${m.slug}`}>{m.title}</Link>
                  </span>
                </div>
                <div className="vote-meta">
                  {formatDate(m.date)} · {m.identifier} · voted{' '}
                  <strong>{v.p.replace('_', ' ')}</strong>
                  {m.clerk_rollnumber != null && (
                    <> · roll call {m.clerk_rollnumber}</>
                  )}
                  {' · '}
                  <a href={m.url} target="_blank" rel="noreferrer noopener">
                    official record
                  </a>
                  {m.archive_url && (
                    <>
                      {' · '}
                      <a href={m.archive_url} target="_blank" rel="noreferrer noopener">
                        archived
                      </a>
                    </>
                  )}
                </div>
                {/* Surfaced here, not just on the measure page. A vote whose
                    meaning is contested should carry its caveat where the
                    reader forms the judgment, not one click away. */}
                {m.notes && m.significance < 3 && (
                  <details>
                    <summary className="faint">How much weight this vote carries</summary>
                    <p className="faint" style={{ margin: 0 }}>{m.notes}</p>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="faint">
        A vote counts as &ldquo;against surveillance&rdquo; based on what the measure does,
        not how it is titled — an amendment that <em>restricts</em> surveillance scores a
        yes vote as against. <Link href="/methodology">Read the method →</Link>
      </p>

      <div id="contact" style={{ scrollMarginTop: '4.5rem' }}>
        <ContactPanel person={person} measures={bundle.measures} />
      </div>

      <div className="source">
        <p>
          Every vote above comes from the official roll call record, cross-checked against{' '}
          <a href="https://voteview.com">Voteview</a>. If something here is wrong, it is a
          bug we want to fix — <Link href="/methodology">how to report it</Link>.
        </p>
      </div>
    </div>
  )
}
