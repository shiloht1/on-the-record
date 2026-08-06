import Link from 'next/link'

export const metadata = {
  title: 'Legal and corrections',
  description:
    'What this site is, the editorial standard behind every rating, how to challenge one, and the limits of what is published here.',
}

export default function LegalPage() {
  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>Legal and corrections</h1>
      <p className="lede">
        This site makes factual claims about people who hold public office. That obligation
        is taken seriously, so this page sets out the standard those claims are held to and
        how to challenge any of them.
      </p>

      <h2>What this is</h2>
      <p>
        An independent, non-commercial project published by a private individual. It is not
        affiliated with, endorsed by, or funded by any campaign, political party, political
        committee, government body, or company named on this site. Nobody is paid, nothing
        is sold, no advertising is carried, no donations are solicited, and no money changes
        hands in either direction.
      </p>

      <h2>The editorial standard</h2>
      <p>
        Every rating is derived from recorded votes and primary-source documents. Each
        claim is stored alongside the source URL, publisher, and date that supports it, and
        that link is enforced by the database itself — a claim with no source cannot be
        saved and the site fails to build rather than publishing it.
      </p>
      <p>Concretely, that means:</p>
      <ul>
        <li>
          Ratings come only from official roll call records and formal acts. Press releases,
          interviews and social posts are shown as context but can never on their own
          produce a positive or negative mark.
        </li>
        <li>
          Whether a yes vote counts for or against surveillance is set per measure from the
          bill text, not inferred from its title, and every vote page states which way it
          cuts and why.
        </li>
        <li>
          Vote counts, dates, and roll call numbers are cross-checked against an independent
          dataset, and any disagreement fails the build.
        </li>
        <li>
          Votes that are procedural, ambiguous in direction, or unrepresentative are
          deliberately excluded, and the exclusions are published with reasons rather than
          quietly dropped.
        </li>
      </ul>
      <p>
        The full method is on the <Link href="/methodology">methodology page</Link>.
      </p>

      <h2>Scope: public acts only</h2>
      <p>
        This site covers what officials did in office — how they voted, what they
        sponsored, what they signed, and what they said on the record in official
        proceedings. It does not publish home addresses, personal phone numbers, family
        details, or private facts about officials, candidates, staff, or private
        individuals, and it will not. Contact details shown are the official public office
        numbers and web forms that exist for constituent contact.
      </p>
      <p>
        Pages about companies record what those companies sell and to whom, drawn from
        public contracting records and published reporting. Nothing on this site alleges
        that any company has broken the law.
      </p>

      <h2>Corrections</h2>
      <p>
        If something here is wrong, it is a defect and it will be fixed quickly and in the
        open. To report one, provide the page, the specific claim, and the source that
        contradicts it. Reports that identify a specific factual error will be checked
        against the primary record and, where the error is confirmed, corrected at the
        source data and noted publicly.
      </p>
      <p>
        Ratings are recomputed from the underlying records, so a corrected vote propagates
        automatically to every page that depends on it. The underlying dataset is published
        alongside the site so that any claim can be independently audited rather than taken
        on trust.
      </p>

      <div className="callout">
        <p>
          <strong>A disagreement is not a correction.</strong> If the record shows a member
          voted a certain way and they would rather it did not, that is not an error and it
          will not be removed. If the record itself is wrong, or we have misread it, that
          is an error and it will be.
        </p>
      </div>

      <h2>Opinion, and where the line is</h2>
      <p>
        Statements of fact on this site — how someone voted, on what date, on which bill —
        are drawn from the official record and linked to it. The characterisation built on
        top of them, including the ratings and the language describing them, is opinion
        based on those disclosed facts. Readers can see every fact behind every judgement
        and are free to reach a different one.
      </p>

      <h2>Draft messages</h2>
      <p>
        The site generates suggested text for contacting officials. Anything sent is the
        sender&rsquo;s own speech, sent from their own account, and they are responsible
        for it. Edit it — messages in a person&rsquo;s own words carry more weight than
        identical text sent by many people, which offices file as a form campaign.
      </p>

      <h2>No warranty, and not advice</h2>
      <p>
        This site is provided as is. Considerable effort goes into accuracy, and the
        verification process is published, but no guarantee is offered that every record is
        complete or current. Nothing here is legal advice, and nothing here tells you how
        to vote — it reports what officials did and leaves the conclusion to you.
      </p>
      <p>
        Federal ratings reflect votes on surveillance <em>authority</em>. They are not a
        record of local camera contracts, which are approved by city councils and county
        boards, and the site does not present them as one.
      </p>

      <h2>Sources and licensing</h2>
      <p>
        This site is built on public data, some of which carries attribution requirements.
        Those are set out on the <Link href="/sources">sources page</Link>.
      </p>

      <div className="source">
        <p>
          Privacy is covered separately, in detail, on the{' '}
          <Link href="/privacy">privacy page</Link> — including how to verify the claims
          made there yourself.
        </p>
      </div>
    </div>
  )
}
