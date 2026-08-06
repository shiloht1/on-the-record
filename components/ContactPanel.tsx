'use client'

import { useMemo, useState } from 'react'
import type { Measure, Person } from '@/lib/types'
import { buildDraft } from '@/lib/draft'
import {
  contactPlan,
  gmailUrl,
  mailtoUrl,
  outlookUrl,
  telUrl,
} from '@/lib/compose-links'

const FIELD: React.CSSProperties = {
  padding: '.7rem .85rem',
  fontSize: '1rem',
  fontFamily: 'inherit',
  borderRadius: 7,
  border: '1.5px solid var(--rule-strong)',
  background: 'var(--bg-raised)',
  color: 'var(--fg)',
  flex: '1 1 12rem',
  minWidth: 0,
}

/**
 * The action layer.
 *
 * Ordered by what actually works. Phone is first because congressional offices
 * weight calls far above email, and because it is the only channel with 100%
 * coverage in the data — most House members publish no email address at all.
 */
export function ContactPanel({ person, measures }: { person: Person; measures: Measure[] }) {
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  /**
   * null means "follow the generated draft". Once the visitor edits the text we
   * stop overwriting it. Previously this was an uncontrolled textarea, so it
   * kept showing the placeholder draft after the name and town were filled in,
   * and any edits were silently discarded on copy.
   */
  const [edited, setEdited] = useState<string | null>(null)

  const plan = useMemo(() => contactPlan(person), [person])
  const draft = useMemo(
    () => buildDraft(person, measures, name.trim() || '[your name]', place.trim()),
    [person, measures, name, place],
  )

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API needs a secure context and can be denied. The textarea
      // below is always present, so there is a manual path either way.
      return
    }
    setCopied(what)
    setTimeout(() => setCopied(null), 2500)
  }

  const to = plan.email ?? ''
  const bodyText = edited ?? draft.body

  return (
    <section>
      <h2>Contact {person.name}</h2>

      <p className="muted" style={{ fontSize: '.94rem' }}>
        This message cites {person.name.split(' ').slice(-1)[0]}&rsquo;s own votes with
        dates, and states your position in the one word the office will write down.
        Congressional staff log every contact as <em>for</em> or <em>against</em> and the
        daily count is what reaches the member — so the draft asks, explicitly, to be
        recorded as <strong>{draft.tallyPosition}</strong>.
      </p>

      <label style={{ display: 'block', margin: '1.25rem 0 .4rem', fontWeight: 550 }}>
        Your name and town{' '}
        <span className="faint">
          — both stay in your browser, exactly like your address did
        </span>
      </label>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          aria-label="Your name"
          style={FIELD}
        />
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Brooklyn 11215"
          aria-label="Your town and ZIP"
          style={FIELD}
        />
      </div>
      <p className="faint" style={{ marginTop: '.45rem' }}>
        Town and ZIP matter more than they look. Constituent status is the first filter an
        office applies — contacts that do not clearly come from the district are set aside
        before anyone reads the argument.
      </p>

      {plan.phone && (
        <div className="callout">
          <p>
            <strong>Call. It is tallied the same day.</strong> Staff log calls by position
            immediately and the running for/against count goes to the member — email gets
            read later, if at all. Thirty seconds.
          </p>
          <p style={{ margin: '.7rem 0' }}>
            <a className="btn primary" href={telUrl(plan.phone)}>
              Call {plan.phone}
            </a>{' '}
            <button className="small" onClick={() => copy(draft.phoneScript, 'script')}>
              {copied === 'script' ? 'Script copied' : 'Copy call script'}
            </button>
          </p>
          <pre
            className="faint"
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              margin: '0 0 .8rem',
              fontSize: '.93rem',
              lineHeight: 1.55,
            }}
          >
            {draft.phoneScript}
          </pre>
          <p className="faint" style={{ marginBottom: 0 }}>
            <strong>Two things that make it count.</strong> Say your city and ZIP first —
            non-constituents get filtered before anything else is heard. And read it flat.
            Staff are trained to defuse angry callers and file them as &ldquo;upset
            constituent,&rdquo; which gets discounted; a calm statement of a voting rule
            gets filed as a position, which is what goes in the count. If nobody picks up,
            leave it as a voicemail — those are tallied the same way.
          </p>
        </div>
      )}

      <h3 style={{ marginTop: '1.75rem' }}>Send it in writing</h3>

      {plan.note && (
        <p className="muted" style={{ fontSize: '.92rem' }}>
          {plan.note}
        </p>
      )}

      <div className="actions">
        {plan.canPrefillRecipient ? (
          <>
            <a
              className="btn primary"
              href={gmailUrl(to, draft.subject, bodyText)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open in Gmail
            </a>
            <a
              className="btn"
              href={outlookUrl(to, draft.subject, bodyText)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Outlook
            </a>
            <a className="btn" href={mailtoUrl(to, draft.subject, bodyText)}>
              Default mail app
            </a>
          </>
        ) : (
          (plan.webform || plan.website) && (
            <a
              className="btn primary"
              href={(plan.webform ?? plan.website)!}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => copy(bodyText, 'body')}
            >
              Copy message &amp; open their form
            </a>
          )
        )}

        <button onClick={() => copy(bodyText, 'body')}>
          {copied === 'body' ? 'Copied' : 'Copy message'}
        </button>
      </div>

      <details style={{ marginTop: '1.25rem' }} open>
        <summary>Read and edit the message</summary>
        <p className="faint">
          Edit freely — your own words carry more weight than anything generated, and
          identical text across many senders gets filed as a form campaign. Subject:{' '}
          <em>{draft.subject}</em>
        </p>
        <textarea
          className="draft"
          value={bodyText}
          onChange={(e) => setEdited(e.target.value)}
          aria-label="Draft message"
        />
        {edited !== null && (
          <p className="faint">
            Edited.{' '}
            <button className="small" onClick={() => setEdited(null)}>
              Reset to the generated message
            </button>
          </p>
        )}
      </details>
    </section>
  )
}
