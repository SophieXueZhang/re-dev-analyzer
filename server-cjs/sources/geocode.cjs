// Geocoding: Nominatim (OSM) + US Census Geocoder + FCC Census Block
// All free, no API key required

async function geocodeAddress(address) {
  const [nominatim, census] = await Promise.allSettled([
    nominatimGeocode(address),
    censusGeocode(address),
  ]);

  const nom = nominatim.status === 'fulfilled' ? nominatim.value : null;
  const cen = census.status === 'fulfilled' ? census.value : null;

  if (!nom && !cen) throw new Error('Could not geocode address.');

  const lat = nom?.lat || cen?.lat;
  const lon = nom?.lon || cen?.lon;

  // Also get FCC census block data from coordinates
  let fcc = null;
  if (lat && lon) {
    try { fcc = await fccCensusBlock(lat, lon); } catch (e) {}
  }

  return {
    lat, lon,
    displayName: nom?.displayName || cen?.matchedAddress,
    matchedAddress: cen?.matchedAddress || nom?.displayName,
    propertyName: nom?.name || null,
    propertyType: nom?.type || null,
    address: nom?.address || {},
    census: cen?.geographies || {},
    fcc: fcc || {},
    source: { nominatim: !!nom, census: !!cen, fcc: !!fcc },
  };
}

async function nominatimGeocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address, format: 'json', limit: '1', addressdetails: '1',
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'REDevAnalyzer/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  const item = data[0];
  return {
    lat: item.lat, lon: item.lon,
    displayName: item.display_name, name: item.name,
    type: item.type, address: item.address || {},
  };
}

async function censusGeocode(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${new URLSearchParams({
    address, benchmark: 'Public_AR_Current', vintage: 'Current_Current', format: 'json',
  })}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const matches = data?.result?.addressMatches || [];
  if (!matches.length) return null;
  const match = matches[0];
  return {
    matchedAddress: match.matchedAddress,
    lat: String(match.coordinates?.y),
    lon: String(match.coordinates?.x),
    geographies: match.geographies || {},
  };
}

async function fccCensusBlock(lat, lon) {
  const url = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.results?.length) return null;
  const r = data.results[0];
  return {
    blockFips: r.block_fips,
    countyFips: r.county_fips,
    countyName: r.county_name,
    stateFips: r.state_fips,
    stateCode: r.state_code,
    stateName: r.state_name,
  };
}

module.exports = { geocodeAddress };
