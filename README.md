# On the Record

Public-record accountability for the surveillance contracting industry and the
officials who fund it.

Enter an address, see how the people who represent you actually voted on
government surveillance — every rating linked to the roll call it came from —
and send them a message that cites their own record.

Phase 1 (federal) is built and verified. State legislatures, the deployment map,
elections and opponents, and city-council tracking are staged behind it.

---

## Quick start

```bash
npm install
```

```bash
npm run data:all
```

```bash
npm run dev
```

`data:all` fetches upstream sources, builds the database, runs 44 verification
checks against the historical record, and emits the JSON the site reads. It
takes about a minute on a cold cache.

---

## The one rule

**No claim without a receipt.**

Every vote, rating, and statement points at a row in the `evidence` table
holding the source URL, publisher, date, and archive snapshot. The link is
enforced by a `NOT NULL` foreign key, so an unsourced claim cannot be inserted
and the build fails rather than shipping it. `npm run data:verify` asserts that
the constraint is still live.

This is the difference between an accountability project and a smear site, and
it is worth failing builds over.

---

## How ratings work

Two rules do most of the work of keeping this defensible.

**Direction comes from the measure, not the vote.** Each tracked measure
declares `pro_surveillance_position` — which way a *yes* cuts — read off the
bill text, never the title. An amendment that *restricts* surveillance scores a
yea as anti-surveillance. Titles lie: the 2024 reauthorization was called the
"Reforming Intelligence and Securing America Act" and passed without the warrant
requirement that had failed hours earlier on a 212–212 tie.

**Tier 3 evidence never produces a grade.** Sources are tiered — 1 for roll
calls, sponsorships, and signed contracts; 2 for on-the-record statements in
official proceedings; 3 for press releases, interviews, and social posts. A
green or red badge requires tier 1 or 2. Statements are displayed but never
scored. This costs coverage and buys the property that one out-of-context quote
cannot discredit the whole database.

Five ratings, because three colors are not enough to be fair:

| Rating | Meaning |
|---|---|
| ✕ For | Votes only to expand or extend surveillance authority |
| ± Mixed | Votes both ways — shown with the tally; often the persuadable ones |
| ✓ Against | Votes only to restrict surveillance authority |
| – Abstained | Held office for tracked votes and did not vote |
| ? No record | Nothing to report, usually seated after the tracked votes |

"Abstained" and "no record" are separate on purpose. Merging them lets a member
who dodged a vote hide behind the same badge as one who was not yet in office.
Delegates from D.C., Puerto Rico, Guam, the Virgin Islands, American Samoa, and
the Northern Marianas may not vote on final passage and are never marked as
having declined a vote they could not cast.

What we deliberately exclude, and why, is in
[`data/curated/measures/federal/EXCLUDED.md`](data/curated/measures/federal/EXCLUDED.md).

---

## Privacy

This is an anti-surveillance tool, so it does not collect addresses.

Address lookup runs entirely in the browser and talks straight to the Census
Bureau. The address is never sent here, never logged, and never placed in a URL.
The site is a static export with no application server, so there is nothing that
*could* log it. Results render on the same page rather than navigating, because
navigating would tempt passing the address in a query string.

Verified empirically, not just asserted — with the lookup exercised, the address
appears in exactly one request (to `geocoding.geo.census.gov`), zero requests to
our own origin contain it, and the page URL stays clean.

The Census geocoder sends no CORS header, so the call goes out via JSONP. The
alternative — proxying through our own server — would defeat the entire point.

---

## Data sources

| Source | Used for | Notes |
|---|---|---|
| [Voteview](https://voteview.com) | Every member's vote on every roll call | The backbone. Senate roll-call XML on senate.gov is Akamai-blocked to bots, and the Congress.gov vote API covers only the House from 2023 on — Voteview is the only clean path to both chambers |
| [congress-legislators](https://github.com/unitedstates/congress-legislators) | Members, cross-IDs, contact info | Public domain |
| [EFF Atlas of Surveillance](https://atlasofsurveillance.org) | Deployments by agency | CC BY — attribution required |
| [Census Geocoder](https://geocoding.geo.census.gov) | Address → districts | No key, browser-callable |
| [ZCTA→CD crosswalk](https://github.com/OpenSourceActivismTech/us-zipcodes-congress) | ZIP → districts | The geocoder returns *zero* matches for a bare ZIP |
| DeFlock / OpenStreetMap | Mapped ALPR cameras | ODbL — attribution and share-alike |
| USAspending, FEC, OpenStates | Staged for later phases | |

### Gotchas already handled

Each of these silently corrupts data rather than erroring, so they are called
out where they occur:

- **`rollnumber` ≠ `clerk_rollnumber`.** Voteview's internal sequence is not the
  roll number the official record and news reports cite. Both are stored; the
  build cross-checks the curated value against Voteview and fails on mismatch.
- **ICPSR is missing for 218 of 537 current members** in congress-legislators.
  Joining Voteview on it would silently drop them. The join goes through
  Voteview's own members file, where `bioguide_id` is 100% populated.
- **`bioname` contains quoted commas.** `split(',')` shifts every later column
  and produces plausible, wrong votes. All parsing uses a real CSV parser.
- **js-yaml converts unquoted dates to `Date`**, parsed as UTC midnight, which
  in a US timezone stringifies back one day earlier. Curated YAML is parsed with
  `CORE_SCHEMA`, which has no timestamp type.
- **At-large districts** are district `0` upstream, `00` from the geocoder, and
  `cd:1` in OCD-IDs. Miss it and every voter in AK, DE, ND, SD, VT, and WY
  resolves to no representative.
- **22% of ZIPs span multiple House districts**, and some ZIPs (single-building,
  PO box) have no ZCTA at all. Both cases are handled explicitly in the UI
  rather than guessing.

---

## Layout

```
data/curated/     the editorial layer — hand-maintained YAML, code-reviewed
  measures/       which votes count, and which way each one cuts
  vendors.yml     Flock, Axon, Motorola/Vigilant, and 22 others
data/cache/       raw upstream downloads (gitignored)
data/surveillance.db   built SQLite — committed, so ratings are auditable in git
pipeline/         fetch → build → verify → emit
app/, components/, lib/   the site
```

The database is committed on purpose: a `git diff` on it shows exactly which
ratings changed and why. IDs are content-derived so rebuilds are deterministic
and diffs reflect real changes rather than build noise.

---

## Known limitations

- **Federal votes are not local contracts.** No member of Congress votes on your
  city's Flock or Axon contract. Federal ratings reflect votes on *surveillance
  authority*. The site says so on the home page, on every relevant page, and in
  the methodology. Overclaiming here is the most likely way this gets
  discredited.
- **Most of Congress publishes no email address** — 2 of 437 House members list
  a contact form, and essentially none list an address. Phone is populated for
  every member, so the UI leads with a call script. Prefilled Gmail/Outlook/
  mailto paths exist and become primary for state and local officials, who do
  publish addresses.
- **Only 8 measures are scored**, all from the 118th and 119th Congresses.
  Members seated in 2025 or later legitimately have no record yet.
- **Vote data covers current members only.** Members who have left office are
  excluded, since the point is who you can contact or vote against now.

---

## Development note

This directory's name contains a colon, which is the PATH separator. That breaks
`npx` and every bare command in an npm script, because the `node_modules/.bin`
entry npm prepends to PATH gets split into two invalid paths. The scripts here
call binaries by relative path to work around it. Renaming the directory would
let them revert to plain `next dev`.

---

## Contributing a correction

If a rating is wrong, that is a bug and we want it fixed fast and in public.
Open an issue with the person, the claim, and the source that contradicts it.

To add a tracked vote, drop a YAML file in `data/curated/measures/federal/` and
run `npm run data:all`. The build refuses it if `pro_surveillance_position` is
missing or if the tally, date, or clerk roll number disagrees with Voteview.
