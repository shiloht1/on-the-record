import { getBundle } from '@/lib/data'
import { CongressTable } from '@/components/CongressTable'

export const metadata = {
  title: 'Every member of Congress',
  description:
    'Surveillance voting record for all 537 current members of the U.S. House and Senate, each rating linked to the roll call behind it.',
}

export default function CongressPage() {
  const bundle = getBundle()
  return (
    <div className="wrap">
      <h1 style={{ marginTop: '2rem' }}>Every member of Congress</h1>
      <p className="muted narrow">
        All {bundle.people.length} current members, rated on {bundle.measures.length}{' '}
        recorded votes on surveillance authority. Sorted worst-first by default, because
        that is usually who you are looking for.
      </p>
      <CongressTable people={bundle.people} />
    </div>
  )
}
