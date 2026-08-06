import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s — ${SITE.name}` },
  description: SITE.description,
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>

        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              {SITE.name} <span>· surveillance</span>
            </Link>
            <nav>
              <Link href="/congress">Congress</Link>
              <Link href="/measures">Votes</Link>
              <Link href="/vendors">Vendors</Link>
              <Link href="/methodology">Methodology</Link>
            </nav>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="wrap">
            <nav className="footer-nav" aria-label="Site information">
              <Link href="/methodology">Methodology</Link>
              <Link href="/sources">Sources</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/legal">Legal &amp; corrections</Link>
            </nav>
            <p>
              Built entirely from public records. Every rating links to the roll call or
              document it came from — if a claim here has no source, it is a defect, and{' '}
              <Link href="/legal">we want to hear about it</Link>.
            </p>
            <p>
              Vote data from <a href="https://voteview.com">Voteview</a> (Lewis, Poole,
              Rosenthal, Boche, Rudkin &amp; Sonnet, UCLA). Member data from{' '}
              <a href="https://github.com/unitedstates/congress-legislators">
                @unitedstates/congress-legislators
              </a>{' '}
              (public domain). Address lookup by the{' '}
              <a href="https://geocoding.geo.census.gov">U.S. Census Bureau</a>.{' '}
              <Link href="/sources">Full sources and licensing</Link>.
            </p>
            <p className="faint">
              An independent, non-commercial project by a private individual. Not
              affiliated with or funded by any campaign, party, political committee,
              government body, or company named here. It covers officials&rsquo; public
              acts in office and publishes no personal information about anyone —
              officials, candidates, staff, or private individuals.
            </p>
            <p className="faint">
              No cookies, no analytics, no tracking, nothing collected. Your address never
              reaches this site — see <Link href="/privacy">privacy</Link>, which explains
              how to verify that yourself.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
