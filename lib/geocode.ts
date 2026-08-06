/**
 * Address -> districts, entirely in the visitor's browser.
 *
 * This is an anti-surveillance site. Sending visitors' home addresses to our
 * server would be both hypocritical and a subpoena target, so the request goes
 * straight from the browser to the Census Bureau and the address is never
 * transmitted to us, never logged, and never placed in a URL we control.
 *
 * JSONP rather than fetch(): the Census geocoder returns no
 * Access-Control-Allow-Origin header, so a normal cross-origin fetch is blocked.
 * The alternative — proxying through our own server — would defeat the entire
 * point. JSONP does execute a script from census.gov, which is an acceptable
 * trust dependency for a .gov endpoint we are already relying on for truth.
 */

const GEOCODER = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress'

export interface DistrictResult {
  matchedAddress: string
  state: string
  stateFips: string
  congressionalDistrict: string | null
  stateUpperDistrict: string | null
  stateLowerDistrict: string | null
  county: string | null
  place: string | null
  ocdIds: {
    state: string
    cd: string | null
    place: string | null
    county: string | null
  }
}

const FIPS_TO_USPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP',
  '72': 'PR', '78': 'VI',
}

let callbackSeq = 0

function jsonp(url: string, timeoutMs = 20_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const name = `__geo_cb_${Date.now()}_${callbackSeq++}`
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as any)[name]
      script.remove()
      clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('The Census address lookup timed out. Please try again.'))
    }, timeoutMs)

    ;(window as any)[name] = (data: any) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Could not reach the Census geocoder.'))
    }

    script.src = `${url}&format=jsonp&callback=${name}`
    document.body.appendChild(script)
  })
}

/**
 * The layer key is versioned by Congress ("119th Congressional Districts"), so
 * it must be matched by pattern. Matching the literal string would silently
 * return no representative the moment the 120th Congress is seated.
 */
function findLayer(geographies: Record<string, any[]>, pattern: RegExp): any | null {
  for (const key of Object.keys(geographies)) {
    if (pattern.test(key)) return geographies[key]?.[0] ?? null
  }
  return null
}

export async function lookupDistricts(address: string): Promise<DistrictResult> {
  const url =
    `${GEOCODER}?address=${encodeURIComponent(address)}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current`

  const data = await jsonp(url)
  const match = data?.result?.addressMatches?.[0]
  if (!match) {
    throw new Error(
      'No match for that address. Try including the city and state, or the full street address.',
    )
  }

  const g = match.geographies ?? {}
  const stateLayer = findLayer(g, /^States$/i)
  const cdLayer = findLayer(g, /Congressional District/i)
  const upperLayer = findLayer(g, /Legislative Districts?\s*-?\s*Upper/i)
  const lowerLayer = findLayer(g, /Legislative Districts?\s*-?\s*Lower/i)
  const countyLayer = findLayer(g, /^Counties$/i)
  const placeLayer = findLayer(g, /Incorporated Places/i)

  const stateFips: string = stateLayer?.GEOID ?? match.addressComponents?.state ?? ''
  const state = FIPS_TO_USPS[stateFips] ?? match.addressComponents?.state ?? ''

  // CD GEOID is state FIPS + 2-digit district. At-large states report "00",
  // which OCD numbers as cd:1 — miss this and every voter in AK, DE, ND, SD,
  // VT, and WY resolves to no representative at all.
  let cd: string | null = null
  if (cdLayer?.GEOID) {
    const raw = String(cdLayer.GEOID).slice(-2)
    const n = Number(raw)
    cd = String(n === 0 ? 1 : n)
  }

  const stateOcd = `ocd-division/country:us/state:${state.toLowerCase()}`

  return {
    matchedAddress: match.matchedAddress,
    state,
    stateFips,
    congressionalDistrict: cd,
    stateUpperDistrict: upperLayer?.BASENAME ?? null,
    stateLowerDistrict: lowerLayer?.BASENAME ?? null,
    county: countyLayer?.NAME ?? null,
    place: placeLayer?.NAME ?? null,
    ocdIds: {
      state: stateOcd,
      cd: cd ? `${stateOcd}/cd:${cd}` : null,
      place: placeLayer?.NAME
        ? `${stateOcd}/place:${placeLayer.NAME.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_(city|town|village|borough)$/, '')}`
        : null,
      county: countyLayer?.NAME
        ? `${stateOcd}/county:${countyLayer.NAME.toLowerCase().replace(/\s+county$/, '').replace(/[^a-z0-9]+/g, '_')}`
        : null,
    },
  }
}

/** True if the input looks like a bare ZIP rather than a street address. */
export function isBareZip(input: string): boolean {
  return /^\s*\d{5}(-\d{4})?\s*$/.test(input)
}

export interface ZipResult {
  zip: string
  state: string
  /** Every congressional district this ZIP touches. Often more than one. */
  districts: string[]
  stateOcd: string
  cdOcds: string[]
}

let zipTable: Record<string, string> | null = null

/**
 * ZIP -> districts, from a crosswalk shipped with the site.
 *
 * The Census geocoder cannot do this: a bare ZIP returns zero matches there.
 * Note that roughly a fifth of ZIPs straddle a district boundary, so this
 * deliberately returns a list and lets the caller disambiguate rather than
 * silently picking one and showing someone the wrong representative.
 *
 * Like the address path, this touches no server of ours — the table is a static
 * file and the lookup is local.
 */
export async function lookupZip(input: string): Promise<ZipResult> {
  const zip = input.trim().slice(0, 5)

  if (!zipTable) {
    // Must carry the basePath explicitly. Next rewrites <Link> and <Image> for
    // a subpath deployment but leaves fetch() alone, so a bare '/data/...'
    // silently 404s once the site is served from a subdirectory.
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const res = await fetch(`${base}/data/zip-districts.json`)
    if (!res.ok) throw new Error('Could not load ZIP data.')
    zipTable = (await res.json()) as Record<string, string>
  }

  const entry = zipTable[zip]
  if (!entry) {
    throw new Error(
      `We do not have district data for ZIP ${zip}. Some ZIP codes cover a single ` +
        `building or a set of PO boxes and have no district mapping. Enter a street ` +
        `address instead and we will look it up exactly.`,
    )
  }

  const [state, cdList] = entry.split(':')
  const districts = cdList.split(',').filter(Boolean)
  const stateOcd = `ocd-division/country:us/state:${state.toLowerCase()}`

  return {
    zip,
    state,
    districts,
    stateOcd,
    cdOcds: districts.map((d) => `${stateOcd}/cd:${d}`),
  }
}
