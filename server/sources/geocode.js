// Geocoding via Nominatim (free, no key) + Census Geocoder (free, no key)
export async function geocodeAddress(address) {
  const results = await Promise.allSettled([
    nominatimGeocode(address),
    censusGeocode(address),
  ]);

  const nominatim = results[0].status === 'fulfilled' ? results[0].value : null;
  const census = results[1].status === 'fulfilled' ? results[1].value : null;

  if (!nominatim && !census) {
    throw new Error('Could not geocode address. Please check the address and try again.');
  }

  return {
    lat: nominatim?.lat || census?.lat,
    lon: nominatim?.lon || census?.lon,
    displayName: nominatim?.displayName || census?.matchedAddress,
    matchedAddress: census?.matchedAddress || nominatim?.displayName,
    propertyName: nominatim?.name || null,
    propertyType: nominatim?.type || null,
    address: nominatim?.address || {},
    census: census?.geographies || {},
    source: { nominatim: !!nominatim, census: !!census },
  };
}

async function nominatimGeocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  })}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'REDevAnalyzer/1.0' },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;

  const item = data[0];
  return {
    lat: item.lat,
    lon: item.lon,
    displayName: item.display_name,
    name: item.name,
    type: item.type,
    address: item.address || {},
  };
}

async function censusGeocode(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${new URLSearchParams({
    address,
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    format: 'json',
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
