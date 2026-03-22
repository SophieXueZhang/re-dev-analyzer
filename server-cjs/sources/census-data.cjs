// US Census ACS API - FREE, NO KEY
// Provides: median income, home values, population, housing stats per tract

async function fetchCensusData(geo) {
  const tract = extractTract(geo);
  if (!tract) {
    console.log('  [census] No tract data, skipping ACS lookup');
    return { available: false };
  }

  const { stateFips, countyFips, tractCode } = tract;
  console.log(`  [census] Fetching ACS data for tract ${stateFips}${countyFips}${tractCode}`);

  const [acsBasic, acsHousing, acsProfile] = await Promise.allSettled([
    fetchACSBasic(stateFips, countyFips, tractCode),
    fetchACSHousing(stateFips, countyFips, tractCode),
    fetchACSProfile(stateFips, countyFips, tractCode),
  ]);

  const basic = acsBasic.status === 'fulfilled' ? acsBasic.value : null;
  const housing = acsHousing.status === 'fulfilled' ? acsHousing.value : null;
  const profile = acsProfile.status === 'fulfilled' ? acsProfile.value : null;

  return {
    available: true,
    tract: `${stateFips}${countyFips}${tractCode}`,
    medianHouseholdIncome: basic?.medianIncome || null,
    medianHomeValue: basic?.medianHomeValue || null,
    totalPopulation: basic?.totalPop || null,
    totalHousingUnits: housing?.totalUnits || null,
    occupiedUnits: housing?.occupiedUnits || null,
    vacantUnits: housing?.vacantUnits || null,
    vacancyRate: housing?.vacancyRate || null,
    ownerOccupied: housing?.ownerOccupied || null,
    renterOccupied: housing?.renterOccupied || null,
    medianRent: housing?.medianRent || null,
    medianYearBuilt: housing?.medianYearBuilt || null,
    medianRooms: housing?.medianRooms || null,
    employmentRate: profile?.employmentRate || null,
    povertyRate: profile?.povertyRate || null,
    medianAge: profile?.medianAge || null,
    source: 'US Census Bureau ACS 5-Year Estimates',
  };
}

function extractTract(geo) {
  // Try Census geographies first
  const tracts = geo.census?.['Census Tracts'];
  if (tracts?.length) {
    const t = tracts[0];
    return {
      stateFips: t.STATE, countyFips: t.COUNTY, tractCode: t.TRACT,
    };
  }
  // Try FCC data
  if (geo.fcc?.blockFips) {
    const fips = geo.fcc.blockFips;
    return {
      stateFips: fips.substring(0, 2),
      countyFips: fips.substring(2, 5),
      tractCode: fips.substring(5, 11),
    };
  }
  return null;
}

async function fetchACSBasic(state, county, tract) {
  // B19013_001E = median household income
  // B25077_001E = median home value
  // B01003_001E = total population
  const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B19013_001E,B25077_001E,B01003_001E&for=tract:${tract}&in=state:${state}&in=county:${county}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length < 2) return null;
  const row = data[1];
  return {
    name: row[0],
    medianIncome: parseNum(row[1]),
    medianHomeValue: parseNum(row[2]),
    totalPop: parseNum(row[3]),
  };
}

async function fetchACSHousing(state, county, tract) {
  // B25001_001E = total housing units
  // B25002_002E = occupied
  // B25002_003E = vacant
  // B25003_002E = owner occupied
  // B25003_003E = renter occupied
  // B25064_001E = median gross rent
  // B25035_001E = median year built
  // B25018_001E = median rooms
  const url = `https://api.census.gov/data/2022/acs/acs5?get=B25001_001E,B25002_002E,B25002_003E,B25003_002E,B25003_003E,B25064_001E,B25035_001E,B25018_001E&for=tract:${tract}&in=state:${state}&in=county:${county}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length < 2) return null;
  const r = data[1];
  const total = parseNum(r[0]);
  const occupied = parseNum(r[1]);
  const vacant = parseNum(r[2]);
  return {
    totalUnits: total,
    occupiedUnits: occupied,
    vacantUnits: vacant,
    vacancyRate: total > 0 ? ((vacant / total) * 100).toFixed(1) + '%' : null,
    ownerOccupied: parseNum(r[3]),
    renterOccupied: parseNum(r[4]),
    medianRent: parseNum(r[5]),
    medianYearBuilt: parseNum(r[6]),
    medianRooms: parseNum(r[7]),
  };
}

async function fetchACSProfile(state, county, tract) {
  // DP03_0004PE = employment rate
  // DP03_0128PE = poverty rate
  // DP05_0018E = median age
  const url = `https://api.census.gov/data/2022/acs/acs5/profile?get=DP03_0004PE,DP03_0128PE,DP05_0018E&for=tract:${tract}&in=state:${state}&in=county:${county}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length < 2) return null;
  const r = data[1];
  return {
    employmentRate: r[0] ? r[0] + '%' : null,
    povertyRate: r[1] ? r[1] + '%' : null,
    medianAge: parseNum(r[2]),
  };
}

function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === '-666666666' || val === '-999999999') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

module.exports = { fetchCensusData };
