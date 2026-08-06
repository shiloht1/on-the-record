import Link from 'next/link'
import { getBundle } from '@/lib/data'

export const metadata = {
  title: 'Sources and licensing',
  description:
    'Every dataset behind this site, where it comes from, and the attribution its licence requires.',
}

export default function SourcesPage() {
  const bundle = getBundle()

  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>Sources and licensing</h1>
      <p className="lede">
        Everything here is built from public data. Several of these datasets carry
        attribution conditions, and this page satisfies them. It is also the fastest way to
        check our work: every source is linked, so you can go read the original.
      </p>

      <h2>Congressional votes</h2>
      <p>
        <strong>Voteview</strong> — Lewis, Jeffrey B., Keith Poole, Howard Rosenthal, Adam
        Boche, Aaron Rudkin, and Luke Sonnet. <em>Voteview: Congressional Roll-Call Votes
        Database.</em> UCLA.{' '}
        <a href="https://voteview.com" target="_blank" rel="noreferrer noopener">
          voteview.com
        </a>
      </p>
      <p className="faint">
        Used for how every member voted on every roll call. This is the backbone of the
        site: Senate roll-call XML on senate.gov blocks automated access, and the
        Congress.gov vote API covers only the House from 2023 onward, so Voteview is the
        only clean route to complete data for both chambers.
      </p>

      <h2>Members of Congress</h2>
      <p>
        <strong>@unitedstates/congress-legislators</strong> — public domain (CC0).{' '}
        <a
          href="https://github.com/unitedstates/congress-legislators"
          target="_blank"
          rel="noreferrer noopener"
        >
          github.com/unitedstates/congress-legislators
        </a>
      </p>
      <p className="faint">
        Names, parties, districts, terms, official phone numbers and contact forms, and the
        cross-identifiers that let Voteview records join to everything else.
      </p>

      <h2>Official vote records</h2>
      <p>
        <strong>Office of the Clerk, U.S. House of Representatives</strong> —{' '}
        <a href="https://clerk.house.gov/Votes" target="_blank" rel="noreferrer noopener">
          clerk.house.gov
        </a>
        <br />
        <strong>United States Senate</strong> —{' '}
        <a
          href="https://www.senate.gov/legislative/votes.htm"
          target="_blank"
          rel="noreferrer noopener"
        >
          senate.gov
        </a>
      </p>
      <p className="faint">
        United States Government Works, no copyright. Every measure on this site links
        directly to its official record so any claim can be checked at the source.
      </p>

      <h2>Address and district lookup</h2>
      <p>
        <strong>U.S. Census Bureau Geocoder</strong> —{' '}
        <a
          href="https://geocoding.geo.census.gov"
          target="_blank"
          rel="noreferrer noopener"
        >
          geocoding.geo.census.gov
        </a>
      </p>
      <p>
        <strong>ZCTA to congressional district crosswalk</strong> — raw data are United
        States Government Works with no copyright; conversion scripts MIT licensed,
        © Spacedog XYZ.{' '}
        <a
          href="https://github.com/OpenSourceActivismTech/us-zipcodes-congress"
          target="_blank"
          rel="noreferrer noopener"
        >
          github.com/OpenSourceActivismTech/us-zipcodes-congress
        </a>
      </p>
      <p className="faint">
        Derived from 2020 Census block equivalency and ZCTA relationship files. We
        deliberately use the Census-derived file rather than the companion HUD-derived one
        in the same repository: the HUD USPS crosswalk is licensed only to government
        entities and to nonprofits working within HUD&rsquo;s stated purpose, which this
        project is not.
      </p>

      <h2>Surveillance deployments</h2>
      <p>
        <strong>Atlas of Surveillance</strong> — Electronic Frontier Foundation and the
        Reynolds School of Journalism, University of Nevada, Reno. Licensed{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer noopener"
        >
          CC BY 4.0
        </a>
        .{' '}
        <a href="https://atlasofsurveillance.org" target="_blank" rel="noreferrer noopener">
          atlasofsurveillance.org
        </a>
      </p>
      <p>
        <strong>DeFlock</strong> and <strong>OpenStreetMap</strong> contributors — map data
        licensed under the{' '}
        <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer noopener">
          Open Database License (ODbL)
        </a>
        .{' '}
        <a href="https://deflock.me" target="_blank" rel="noreferrer noopener">
          deflock.me
        </a>
      </p>
      <p className="faint">
        Attribution is recorded here in advance of the deployment map, which is the next
        component to be built. Where data derived from these sources appears on the site,
        the CC BY and ODbL conditions — including share-alike for ODbL derivatives — will
        be honoured.
      </p>

      <h2>Company information</h2>
      <p className="faint">
        Vendor pages are compiled from public contracting records, company filings and
        published reporting. They record what each company sells and to whom. They do not
        allege unlawful conduct by anyone.
      </p>

      <h2>Software</h2>
      <p className="faint">
        Built with Next.js and React. The site is a static export with no application
        server and no database at runtime — which is what makes the privacy guarantee on
        the <Link href="/privacy">privacy page</Link> a structural property rather than a
        promise.
      </p>

      <div className="source">
        <p>
          Currently tracking {bundle.measures.length} recorded votes across{' '}
          {bundle.people.length} sitting members of Congress and {bundle.orgs.length}{' '}
          vendors.
          {bundle.built_at && <> Data last built {bundle.built_at.slice(0, 10)}.</>} If you
          believe a source is misattributed or a licence condition is unmet, that is a
          defect — see <Link href="/legal">corrections</Link>.
        </p>
      </div>
    </div>
  )
}
