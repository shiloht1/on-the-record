export type Tier = 1 | 2 | 3

export type EvidenceKind =
  | 'roll_call'
  | 'bill_text'
  | 'sponsorship'
  | 'contract_doc'
  | 'executive_action'
  | 'meeting_minutes'
  | 'official_video'
  | 'committee_testimony'
  | 'signed_letter'
  | 'questionnaire'
  | 'press_release'
  | 'news'
  | 'social'
  | 'campaign_material'

export interface EvidenceInput {
  url: string
  publisher: string
  kind: EvidenceKind
  tier: Tier
  date_published?: string
  excerpt?: string
  archive_url?: string
  added_by?: string
}

export type VotePosition = 'yea' | 'nay' | 'present' | 'not_voting'

export type Grade =
  | 'green'
  | 'red'
  | 'mixed'
  | 'gray_declined'
  | 'gray_no_record'

export type Stance = 'pro_surveillance' | 'anti_surveillance' | 'equivocal'

/** Shape of a file in data/curated/measures/**. */
export interface CuratedMeasure {
  slug: string
  level: 'federal' | 'state' | 'county' | 'local'
  chamber?: string
  congress?: number
  session?: string
  jurisdiction_ocd_id?: string
  identifier: string
  /** Voteview's internal sequence number. Not the publicly cited number. */
  rollnumber?: number
  /** The official House Clerk / Senate roll number that the record cites. */
  clerk_rollnumber?: number
  date: string
  title: string
  description?: string
  question?: string
  result?: string
  yea_count?: number
  nay_count?: number
  /** Which way a YES vote cuts. Read off the bill text, never the title. */
  pro_surveillance_position: 'yea' | 'nay'
  topic?: string
  significance?: 1 | 2 | 3
  notes?: string
  evidence: EvidenceInput
}

export interface CuratedVendor {
  slug: string
  name: string
  kind: 'vendor' | 'subsidiary' | 'agency' | 'other'
  parent?: string
  ticker?: string
  hq?: string
  website?: string
  tech?: string[]
  summary?: string
}
