import { getBundle } from '@/lib/data'
import { SITE } from '@/lib/site'
import { Lookup } from '@/components/Lookup'
import Link from 'next/link'

export default function Home() {
  const bundle = getBundle()

  const counts = bundle.people.reduce<Record<string, number>>((acc, p) => {
    acc[p.grade] = (acc[p.grade] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <div className="wrap hero">
        <h1>{SITE.tagline}</h1>
        <p className="lede">
          Enter your address to see how the people who represent you actually voted on
          government surveillance — every rating linked to the roll call it came from —
          and send them a message that cites their own record.
        </p>

        <Lookup people={bundle.people} measures={bundle.measures} byOcd={bundle.by_ocd} />
      </div>

      <div className="wrap narrow">
        <h2>Where Congress stands right now</h2>
        <p>
          Section 702 of FISA — the authority that lets the government search Americans&rsquo;
          communications without a warrant — <strong>lapsed on June 13, 2026</strong> after
          the House rejected a third clean extension. What replaces it is being decided now.
        </p>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rating</th>
                <th>Members</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge red"><span className="sym">✕</span>For</span></td>
                <td className="mono">{counts.red ?? 0}</td>
                <td>Voted only to expand or extend surveillance authority</td>
              </tr>
              <tr>
                <td><span className="badge mixed"><span className="sym">±</span>Mixed</span></td>
                <td className="mono">{counts.mixed ?? 0}</td>
                <td>Voted both ways — often the persuadable ones</td>
              </tr>
              <tr>
                <td><span className="badge green"><span className="sym">✓</span>Against</span></td>
                <td className="mono">{counts.green ?? 0}</td>
                <td>Voted only to restrict surveillance authority</td>
              </tr>
              <tr>
                <td><span className="badge gray_declined"><span className="sym">–</span>Abstained</span></td>
                <td className="mono">{counts.gray_declined ?? 0}</td>
                <td>Held office for these votes and did not vote</td>
              </tr>
              <tr>
                <td><span className="badge gray_no_record"><span className="sym">?</span>No record</span></td>
                <td className="mono">{counts.gray_no_record ?? 0}</td>
                <td>Mostly members seated after the votes we track</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="faint">
          Surveillance is not a partisan issue in Congress, and this table shows it. Both
          parties appear in every row. <Link href="/congress">See all 537 members →</Link>
        </p>

        <div className="callout">
          <p>
            <strong>What these votes are, and what they are not.</strong> No member of
            Congress votes on your city&rsquo;s Flock Safety contract. Federal ratings
            reflect votes on <em>surveillance authority</em> — whether the government needs
            a warrant to read your messages, and whether agencies can buy data they would
            otherwise need a warrant to get. Local camera contracts are decided by city
            councils, and that layer is coming.{' '}
            <Link href="/methodology">How we score this →</Link>
          </p>
        </div>

        <h2>The companies</h2>
        <p>
          Flock Safety and Axon Enterprise are the two largest vendors selling automated
          license plate readers and camera networks to American police departments. When a
          city drops one, it frequently signs with the other — Denver, Syracuse, and Durham
          all moved from Flock to Axon in 2026.{' '}
          <Link href="/vendors">See all {bundle.orgs.length} tracked vendors →</Link>
        </p>
      </div>
    </>
  )
}
