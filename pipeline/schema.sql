-- Surveillance Accountability Platform — schema
--
-- Design rule that governs everything below: no table may assert a fact about a
-- person without pointing at a row in `evidence`. The `evidence_id NOT NULL`
-- constraints are not decoration — they are the mechanism that makes it
-- impossible to ship a colored badge that nobody can check. A build that tries
-- to insert an unsourced claim fails loudly.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------------------------
-- Evidence: the spine
-- ---------------------------------------------------------------------------

CREATE TABLE evidence (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  -- Wayback snapshot. Municipal portals rewrite URLs constantly and an
  -- unarchived citation becomes a dead citation, which is indistinguishable
  -- from a fabricated one.
  archive_url    TEXT,
  publisher      TEXT NOT NULL,
  date_published TEXT,                       -- ISO 8601
  date_captured  TEXT NOT NULL,              -- ISO 8601
  excerpt        TEXT,
  kind           TEXT NOT NULL,
  tier           INTEGER NOT NULL,
  added_by       TEXT NOT NULL DEFAULT 'pipeline',
  verified_at    TEXT,

  CHECK (tier IN (1, 2, 3)),
  CHECK (kind IN (
    -- tier 1: hard record of a formal act
    'roll_call', 'bill_text', 'sponsorship', 'contract_doc', 'executive_action',
    -- tier 2: on-the-record in an official proceeding
    'meeting_minutes', 'official_video', 'committee_testimony', 'signed_letter',
    'questionnaire',
    -- tier 3: everything else a person says in public
    'press_release', 'news', 'social', 'campaign_material'
  )),
  CHECK (url LIKE 'http://%' OR url LIKE 'https://%')
);

CREATE INDEX idx_evidence_kind ON evidence (kind);

-- ---------------------------------------------------------------------------
-- Jurisdictions — the OCD-ID spine
--
-- Open Civic Data IDs (ocd-division/country:us/state:co/place:denver) are the
-- join key across every level of government. OpenStates emits them, Google's
-- surviving Divisions API emits them, and they nest, which is what lets one
-- address resolve to federal + state + county + city in a single walk up the
-- tree.
-- ---------------------------------------------------------------------------

CREATE TABLE jurisdictions (
  ocd_id         TEXT PRIMARY KEY,
  level          TEXT NOT NULL,
  name           TEXT NOT NULL,
  parent_ocd_id  TEXT REFERENCES jurisdictions (ocd_id),
  state          TEXT,
  geoid          TEXT,                       -- Census GEOID, for geocoder joins

  CHECK (level IN ('nation', 'state', 'county', 'place', 'cd', 'sldu', 'sldl'))
);

CREATE INDEX idx_jurisdictions_parent ON jurisdictions (parent_ocd_id);
CREATE INDEX idx_jurisdictions_geoid  ON jurisdictions (geoid);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

CREATE TABLE people (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  level              TEXT NOT NULL,
  party              TEXT,
  ocd_id             TEXT REFERENCES jurisdictions (ocd_id),
  office             TEXT,                   -- 'sen' | 'rep' | 'gov' | 'council' | ...
  state              TEXT,
  district           TEXT,

  -- Cross-IDs. icpsr is the Voteview join key; bioguide is the congress.gov and
  -- congress-legislators key. Getting this mapping wrong is the most likely
  -- silent data bug in the whole project, so verify.ts asserts on it.
  bioguide_id        TEXT UNIQUE,
  icpsr              INTEGER,
  openstates_id      TEXT,
  fec_candidate_id   TEXT,

  -- Contact. `contact_form` matters because many members of Congress accept no
  -- direct email at all — see lib/compose-links.ts.
  phone              TEXT,
  contact_form       TEXT,
  email              TEXT,
  website            TEXT,

  term_start         TEXT,
  term_end           TEXT,
  next_election_date TEXT,
  in_office          INTEGER NOT NULL DEFAULT 1,

  -- Delegates (DC, PR, GU, VI, AS, MP) may not vote on final passage. Without
  -- this flag they would all render as "no record found", which reads as an
  -- accusation of absenteeism rather than a fact about their office.
  is_voting_member   INTEGER NOT NULL DEFAULT 1,

  CHECK (level IN ('federal', 'state', 'county', 'local')),
  CHECK (in_office IN (0, 1)),
  CHECK (is_voting_member IN (0, 1))
);

CREATE INDEX idx_people_ocd     ON people (ocd_id);
CREATE INDEX idx_people_icpsr   ON people (icpsr);
CREATE INDEX idx_people_level   ON people (level, in_office);
CREATE INDEX idx_people_state   ON people (state, office);

-- ---------------------------------------------------------------------------
-- Vendors and what they have deployed
-- ---------------------------------------------------------------------------

CREATE TABLE orgs (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL,
  -- Acquisitions matter for accountability: Fusus deployments are Axon
  -- deployments as of Feb 2024, and Vigilant deployments are Motorola's.
  parent_org_id TEXT REFERENCES orgs (id),
  ticker        TEXT,
  hq            TEXT,
  summary       TEXT,
  website       TEXT,

  CHECK (kind IN ('vendor', 'subsidiary', 'agency', 'other'))
);

CREATE TABLE agencies (
  id      TEXT PRIMARY KEY,
  ori     TEXT,                              -- FBI ORI code where known
  name    TEXT NOT NULL,
  ocd_id  TEXT REFERENCES jurisdictions (ocd_id),
  state   TEXT,
  county  TEXT,
  lat     REAL,
  lng     REAL
);

CREATE INDEX idx_agencies_ocd   ON agencies (ocd_id);
CREATE INDEX idx_agencies_state ON agencies (state);

CREATE TABLE deployments (
  id          TEXT PRIMARY KEY,
  agency_id   TEXT NOT NULL REFERENCES agencies (id),
  org_id      TEXT REFERENCES orgs (id),
  tech_type   TEXT NOT NULL,                 -- 'alpr' | 'face_recognition' | 'drone' | ...
  first_seen  TEXT,
  evidence_id TEXT NOT NULL REFERENCES evidence (id)
);

CREATE INDEX idx_deployments_agency ON deployments (agency_id);
CREATE INDEX idx_deployments_org    ON deployments (org_id);

-- Individual mapped cameras (DeFlock / OpenStreetMap, ODbL).
CREATE TABLE cameras (
  id              TEXT PRIMARY KEY,
  osm_id          TEXT UNIQUE,
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  operator_org_id TEXT REFERENCES orgs (id),
  operator_raw    TEXT,
  direction       TEXT,
  ocd_id          TEXT REFERENCES jurisdictions (ocd_id)
);

CREATE INDEX idx_cameras_geo ON cameras (lat, lng);
CREATE INDEX idx_cameras_ocd ON cameras (ocd_id);

CREATE TABLE contracts (
  id              TEXT PRIMARY KEY,
  buyer_agency_id TEXT REFERENCES agencies (id),
  buyer_ocd_id    TEXT REFERENCES jurisdictions (ocd_id),
  org_id          TEXT NOT NULL REFERENCES orgs (id),
  description     TEXT,
  amount          REAL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  start_date      TEXT,
  end_date        TEXT,
  source          TEXT NOT NULL,             -- 'usaspending' | 'legistar' | 'curated'
  status          TEXT,                      -- 'active' | 'pending_vote' | 'expired'
  evidence_id     TEXT NOT NULL REFERENCES evidence (id)
);

CREATE INDEX idx_contracts_org   ON contracts (org_id);
CREATE INDEX idx_contracts_ocd   ON contracts (buyer_ocd_id);
CREATE INDEX idx_contracts_state ON contracts (status);

-- ---------------------------------------------------------------------------
-- Measures and votes
-- ---------------------------------------------------------------------------

CREATE TABLE measures (
  id                       TEXT PRIMARY KEY,
  slug                     TEXT NOT NULL UNIQUE,
  level                    TEXT NOT NULL,
  jurisdiction_ocd_id      TEXT REFERENCES jurisdictions (ocd_id),
  chamber                  TEXT,
  congress                 INTEGER,
  session                  TEXT,
  identifier               TEXT NOT NULL,    -- 'HR7888', 'S4465'
  -- Voteview's internal sequence, NOT the number anyone cites publicly.
  rollnumber               INTEGER,
  -- The official House Clerk / Senate roll number. This is what news reports
  -- and the official record cite. Conflating the two produces confidently
  -- wrong votes on every page, so both are stored explicitly.
  clerk_rollnumber         INTEGER,
  date                     TEXT NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  question                 TEXT,
  result                   TEXT,
  yea_count                INTEGER,
  nay_count                INTEGER,

  -- Which way a YES vote cuts. Set per measure from the bill text, never
  -- inferred from the title: an amendment that RESTRICTS surveillance scores a
  -- YEA as anti-surveillance, and getting this backwards flips green to red.
  pro_surveillance_position TEXT NOT NULL,
  topic                    TEXT NOT NULL DEFAULT 'surveillance',
  significance             INTEGER NOT NULL DEFAULT 1,
  notes                    TEXT,
  evidence_id              TEXT NOT NULL REFERENCES evidence (id),

  CHECK (level IN ('federal', 'state', 'county', 'local')),
  CHECK (pro_surveillance_position IN ('yea', 'nay')),
  CHECK (significance BETWEEN 1 AND 3)
);

CREATE INDEX idx_measures_topic  ON measures (topic, level);
CREATE INDEX idx_measures_lookup ON measures (congress, chamber, rollnumber);

CREATE TABLE votes (
  person_id   TEXT NOT NULL REFERENCES people (id),
  measure_id  TEXT NOT NULL REFERENCES measures (id),
  position    TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES evidence (id),

  PRIMARY KEY (person_id, measure_id),
  CHECK (position IN ('yea', 'nay', 'present', 'not_voting'))
);

CREATE INDEX idx_votes_measure ON votes (measure_id);

-- Curated non-vote actions: public statements, contract signings, sponsorships.
CREATE TABLE actions (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people (id),
  topic       TEXT NOT NULL DEFAULT 'surveillance',
  stance      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  summary     TEXT NOT NULL,
  date        TEXT,
  evidence_id TEXT NOT NULL REFERENCES evidence (id),

  CHECK (stance IN ('pro_surveillance', 'anti_surveillance', 'equivocal')),
  CHECK (kind IN ('statement', 'contract_signing', 'sponsorship', 'letter',
                  'questionnaire', 'executive_action'))
);

CREATE INDEX idx_actions_person ON actions (person_id, topic);

-- ---------------------------------------------------------------------------
-- Ratings (derived — rebuilt from scratch by rate.ts on every build)
-- ---------------------------------------------------------------------------

CREATE TABLE ratings (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people (id),
  topic         TEXT NOT NULL DEFAULT 'surveillance',
  grade         TEXT NOT NULL,
  pro_count     INTEGER NOT NULL DEFAULT 0,
  anti_count    INTEGER NOT NULL DEFAULT 0,
  declined_count INTEGER NOT NULL DEFAULT 0,
  -- Highest-quality evidence behind the grade. A grade of green or red requires
  -- best_tier <= 2; see rate.ts.
  best_tier     INTEGER,
  rationale     TEXT NOT NULL,
  computed_at   TEXT NOT NULL,

  UNIQUE (person_id, topic),
  CHECK (grade IN ('green', 'red', 'mixed', 'gray_declined', 'gray_no_record'))
);

CREATE TABLE rating_evidence (
  rating_id   TEXT NOT NULL REFERENCES ratings (id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence (id),
  PRIMARY KEY (rating_id, evidence_id)
);

-- ---------------------------------------------------------------------------
-- Elections, opponents, money
-- ---------------------------------------------------------------------------

CREATE TABLE elections (
  id      TEXT PRIMARY KEY,
  ocd_id  TEXT REFERENCES jurisdictions (ocd_id),
  office  TEXT NOT NULL,
  state   TEXT,
  district TEXT,
  date    TEXT NOT NULL,
  kind    TEXT NOT NULL,

  CHECK (kind IN ('primary', 'general', 'runoff', 'special'))
);

CREATE INDEX idx_elections_date ON elections (date);

CREATE TABLE candidacies (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people (id),
  election_id TEXT NOT NULL REFERENCES elections (id),
  incumbent   INTEGER NOT NULL DEFAULT 0,
  status      TEXT,

  UNIQUE (person_id, election_id),
  CHECK (incumbent IN (0, 1))
);

-- Shown as factual disclosure on person pages. Deliberately NOT an input to the
-- rating: implying a quid pro quo we cannot prove would undercut the parts of
-- the record that are airtight.
CREATE TABLE contributions (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people (id),
  org_id      TEXT NOT NULL REFERENCES orgs (id),
  cycle       INTEGER NOT NULL,
  amount      REAL NOT NULL,
  source      TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES evidence (id)
);

CREATE INDEX idx_contributions_person ON contributions (person_id);

-- ---------------------------------------------------------------------------
-- Build provenance
-- ---------------------------------------------------------------------------

CREATE TABLE build_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE source_runs (
  source     TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  url        TEXT,
  row_count  INTEGER,
  notes      TEXT
);
