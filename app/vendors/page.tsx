import { getBundle } from '@/lib/data'

export const metadata = {
  title: 'Surveillance vendors',
  description:
    'The companies selling license plate readers, camera networks, face recognition, and data-fusion platforms to American government agencies.',
}

export default function VendorsPage() {
  const bundle = getBundle()
  const top = bundle.orgs.filter((o) => !o.parent_slug)
  const subsidiaries = new Map<string, typeof bundle.orgs>()
  for (const o of bundle.orgs) {
    if (!o.parent_slug) continue
    const list = subsidiaries.get(o.parent_slug) ?? []
    list.push(o)
    subsidiaries.set(o.parent_slug, list)
  }

  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>The vendors</h1>
      <p className="muted">
        The companies selling surveillance technology to American government agencies.
        Ownership matters here: a Fusus real-time crime center is an Axon product, and a
        Vigilant plate-reader network is Motorola&rsquo;s. Agencies and news coverage often
        still use the acquired brand name.
      </p>

      <div className="callout">
        <p>
          <strong>Dropping one vendor is not the same as ending the program.</strong>{' '}
          Denver, Syracuse, and Durham all cancelled or declined Flock Safety contracts in
          2026 and signed with Axon instead. The cameras stayed; the logo changed. Local
          contract terms — retention period, audit requirements, whether a national
          cross-agency lookup database is included — matter more than which company won.
        </p>
      </div>

      {top.map((o) => (
        <section key={o.slug} style={{ marginTop: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>
            {o.name}{' '}
            {o.ticker && <span className="mono faint">({o.ticker})</span>}
          </h2>
          {o.hq && <p className="faint">{o.hq}</p>}
          {o.summary && <p>{o.summary}</p>}
          {o.website && (
            <p className="faint">
              <a href={o.website} target="_blank" rel="noreferrer noopener">
                {o.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
          {subsidiaries.get(o.slug) && (
            <div className="pill-row">
              {subsidiaries.get(o.slug)!.map((s) => (
                <span className="pill" key={s.slug}>
                  owns {s.name}
                </span>
              ))}
            </div>
          )}
        </section>
      ))}

      <div className="source">
        <p>
          This page records who sells what. It does not allege wrongdoing by any company.
          Contract-level data — which agency bought what, for how much, and when it comes
          up for renewal — is the next layer, drawn from USAspending.gov and the EFF Atlas
          of Surveillance.
        </p>
      </div>
    </div>
  )
}
