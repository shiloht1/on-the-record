export type Grade = 'green' | 'red' | 'mixed' | 'gray_declined' | 'gray_no_record'

export interface Person {
  slug: string
  name: string
  party: string | null
  state: string
  district: string | null
  office: string
  ocd_id: string
  grade: Grade
  pro: number
  anti: number
  declined: number
  rationale: string
  phone: string | null
  contact_form: string | null
  website: string | null
  next_election: string | null
  is_voting_member: boolean
  votes: { m: string; p: string }[]
}

export interface Measure {
  slug: string
  title: string
  description: string | null
  date: string
  chamber: string | null
  identifier: string
  clerk_rollnumber: number | null
  question: string | null
  result: string | null
  yea_count: number | null
  nay_count: number | null
  pro_surveillance_position: 'yea' | 'nay'
  significance: number
  notes: string | null
  url: string
  archive_url: string | null
  publisher: string
  tier: number
}

export interface Org {
  slug: string
  name: string
  kind: string
  ticker: string | null
  hq: string | null
  summary: string | null
  website: string | null
  parent_slug: string | null
  parent_name: string | null
}

export interface Bundle {
  built_at: string | null
  people: Person[]
  measures: Measure[]
  orgs: Org[]
  by_ocd: Record<string, string[]>
}
