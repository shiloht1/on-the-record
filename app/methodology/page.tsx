import Link from 'next/link'
import { getBundle } from '@/lib/data'

export const metadata = {
  title: 'Methodology',
  description:
    'How ratings are produced, what evidence counts, what we deliberately exclude, and how to challenge a rating.',
}

export default function MethodologyPage() {
  const bundle = getBundle()

  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>Methodology</h1>
      <p className="lede">
        A rating that cannot be checked is worth nothing. Everything here is designed so
        you can verify any claim on this site against a primary source in about two clicks.
      </p>

      <h2>No claim without a receipt</h2>
      <p>
        Every vote, rating, and statement in the database points at a row in an evidence
        table holding the source URL, the publisher, the date, and an archived snapshot.
        That link is enforced by the database itself: a claim with no source fails to
        insert, and the build fails. This is not a policy we promise to follow — it is a
        constraint the software cannot route around.
      </p>

      <h2>What counts as evidence</h2>
      <p>Sources are tiered, and the tier determines what they can support.</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Tier</th><th>What it is</th><th>Can it produce a rating?</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">1</td>
              <td>Recorded roll call vote, bill sponsorship, signed contract, executive action</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td className="mono">2</td>
              <td>On the record in official proceedings — floor speech, committee testimony, council minutes, signed letter</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td className="mono">3</td>
              <td>Press release, interview, campaign material, social post</td>
              <td><strong>No</strong> — displayed only</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Tier 3 evidence never produces a green or red mark on its own. Someone&rsquo;s
        record is what they did on the record, not what they said in an interview. This
        rule costs us coverage and is worth it: it means a single out-of-context quote
        cannot be used to discredit the entire database.
      </p>

      <h2>Direction comes from the measure, not the vote</h2>
      <p>
        Each tracked measure declares which way a yes vote cuts, read off the bill text
        rather than the title. An amendment that <em>restricts</em> surveillance scores a
        yes vote as <em>against</em> surveillance. Titles are unreliable — the 2024
        reauthorization was called the &ldquo;Reforming Intelligence and Securing America
        Act&rdquo; and passed without the warrant requirement that had failed hours earlier
        on a 212&ndash;212 tie.
      </p>

      <h2>The five ratings</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Rating</th><th>Means</th></tr></thead>
          <tbody>
            <tr>
              <td><span className="badge red"><span className="sym">✕</span>For</span></td>
              <td>At least one vote or formal action expanding or extending surveillance authority, and none the other way</td>
            </tr>
            <tr>
              <td><span className="badge mixed"><span className="sym">±</span>Mixed</span></td>
              <td>Votes in both directions. Shown with the tally — these are often the people worth calling</td>
            </tr>
            <tr>
              <td><span className="badge green"><span className="sym">✓</span>Against</span></td>
              <td>At least one vote or formal action restricting surveillance authority, and none the other way</td>
            </tr>
            <tr>
              <td><span className="badge gray_declined"><span className="sym">–</span>Abstained</span></td>
              <td>Held office for tracked votes and did not vote on any of them</td>
            </tr>
            <tr>
              <td><span className="badge gray_no_record"><span className="sym">?</span>No record</span></td>
              <td>Nothing to report — usually seated after the votes we track</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        &ldquo;Abstained&rdquo; and &ldquo;no record&rdquo; are kept separate on purpose.
        Merging them would let a member who dodged a vote hide behind the same badge as a
        member who was not yet in office, and would tar the new member with the other&rsquo;s
        choice.
      </p>
      <p>
        Members representing territories — the delegates from D.C., Puerto Rico, Guam, the
        Virgin Islands, American Samoa, and the Northern Mariana Islands — may not vote on
        final passage in the House. They are never marked as having declined a vote they
        were not permitted to cast.
      </p>

      <h2>What we leave out</h2>
      <p>
        Showing what we excluded is part of the method. Procedural votes (cloture, motions
        to proceed, rules) are not scored: senators routinely vote for cloture on bills
        they then vote against, and scoring procedure as substance is the most common way
        scorecards get discredited. Votes whose direction is genuinely ambiguous are not
        scored. Neither is one amendment so sweeping that it drew 11 votes — counting it
        would have marked 81 senators red, including most of the ones who voted for a
        warrant requirement an hour later.
      </p>
      <p>
        The full list, with a reason for each, lives in the repository at{' '}
        <span className="mono">data/curated/measures/federal/EXCLUDED.md</span>.
      </p>

      <h2>What federal votes do and do not tell you</h2>
      <p>
        No member of Congress votes on your city&rsquo;s Flock Safety or Axon contract.
        Those are approved by city councils and county boards. Federal ratings here reflect
        votes on <em>surveillance authority</em> — whether the government needs a warrant to
        search Americans&rsquo; communications, and whether agencies may buy personal data
        they would otherwise need a warrant to obtain. Treating a federal vote as a proxy
        for a local camera contract would be overclaiming, and we do not do it.
      </p>

      <h2>Your address</h2>
      <p>
        The address lookup runs entirely in your browser and talks directly to the U.S.
        Census Bureau geocoder. Your address is never sent to this site, never logged,
        never stored, and never placed in a URL. This site is a static export with no
        application server, so there is nothing here that <em>could</em> log it. You can
        confirm all of that in your browser&rsquo;s network inspector.
      </p>

      <h2>Corrections</h2>
      <p>
        If a rating here is wrong, we want to fix it quickly and publicly. Open an issue in
        the repository with the person, the claim, and the source that contradicts it.
        Being fast and public about corrections is what separates an accountability project
        from a smear site.
      </p>

      <div className="source">
        <p>
          Currently tracking {bundle.measures.length} recorded votes across{' '}
          {bundle.people.length} sitting members of Congress and {bundle.orgs.length}{' '}
          vendors.{' '}
          {bundle.built_at && <>Data built {bundle.built_at.slice(0, 10)}.</>}{' '}
          <Link href="/measures">See the tracked votes →</Link>
        </p>
      </div>
    </div>
  )
}
