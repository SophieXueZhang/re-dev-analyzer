// Risk data from multiple FREE government APIs + web search
const { webSearch } = require('./web-search.cjs');

async function fetchRiskData(address, geo) {
  const lat = geo.lat;
  const lon = geo.lon;
  const city = geo.address?.city || '';
  const state = geo.address?.state || '';
  const county = geo.address?.county || '';

  console.log('  [risk] Fetching from USGS, NOAA, EPA, NREL + web search...');

  const results = await Promise.allSettled([
    fetchSeismicData(lat, lon),
    fetchElevation(lat, lon),
    fetchRecentEarthquakes(lat, lon),
    fetchSolarData(lat, lon),
    fetchNOAAWeather(lat, lon),
    webSearch(`"${address}" flood zone environmental risk hazard FEMA ${city} ${state}`, 8),
    webSearch(`${city} ${state} real estate market trend 2025 2026 vacancy rate rent growth cap rate`, 8),
    fetchOpportunityZone(geo),
    webSearch(`"${city}" "${state}" school rating crime rate safety neighborhood 2025 2026`, 8),
    webSearch(`"${city}" "${state}" population growth demographic trend employment major employers 2025`, 8),
    webSearch(`"${city}" "${state}" new construction multifamily housing development pipeline permits 2025 2026`, 8),
    webSearch(`"${city}" "${state}" days on market median DOM inventory months supply absorption rate list to sale ratio 2025`, 8),
    webSearch(`"${address}" property tax rate mill rate ${county} ${state} tax assessment HOA fees`, 8),
    webSearch(`"${city}" "${state}" foreclosure rate distressed properties auction 2025`, 8),
    webSearch(`"${city}" "${state}" homeowners insurance cost average premium rate 2025`, 8),
    webSearch(`"${city}" "${state}" rent growth year over year average rent increase 2025 2026`, 8),
  ]);

  return {
    seismic: results[0].status === 'fulfilled' ? results[0].value : null,
    elevation: results[1].status === 'fulfilled' ? results[1].value : null,
    earthquakes: results[2].status === 'fulfilled' ? results[2].value : null,
    solar: results[3].status === 'fulfilled' ? results[3].value : null,
    weather: results[4].status === 'fulfilled' ? results[4].value : null,
    envSearch: results[5].status === 'fulfilled' ? results[5].value : { results: [], summary: null },
    marketSearch: results[6].status === 'fulfilled' ? results[6].value : { results: [], summary: null },
    opportunityZone: results[7].status === 'fulfilled' ? results[7].value : null,
    schoolCrimeSearch: results[8].status === 'fulfilled' ? results[8].value : { results: [], summary: null },
    demographicSearch: results[9].status === 'fulfilled' ? results[9].value : { results: [], summary: null },
    supplySearch: results[10].status === 'fulfilled' ? results[10].value : { results: [], summary: null },
    marketActivitySearch: results[11].status === 'fulfilled' ? results[11].value : { results: [], summary: null },
    propertyTaxSearch: results[12].status === 'fulfilled' ? results[12].value : { results: [], summary: null },
    foreclosureSearch: results[13].status === 'fulfilled' ? results[13].value : { results: [], summary: null },
    insuranceSearch: results[14].status === 'fulfilled' ? results[14].value : { results: [], summary: null },
    rentGrowthSearch: results[15].status === 'fulfilled' ? results[15].value : { results: [], summary: null },
    source: 'USGS, NOAA, NREL, EPA, Web Search',
  };
}

// USGS Seismic Design Values (for building design requirements)
async function fetchSeismicData(lat, lon) {
  const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-22.json?latitude=${lat}&longitude=${lon}&riskCategory=II&siteClass=D&title=PropertyAnalysis`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.response?.data;
  if (!r) return null;
  return {
    ss: r.ss,   // short-period spectral acceleration
    s1: r.s1,   // 1-second spectral acceleration
    sds: r.sds, // design spectral acceleration (short)
    sd1: r.sd1, // design spectral acceleration (1-sec)
    seismicDesignCategory: r.sdc || null,
    pgaM: r.pgaM || null,
    source: 'USGS ASCE 7-22',
  };
}

// USGS Elevation
async function fetchElevation(lat, lon) {
  const url = `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&units=Feet&wkid=4326`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    elevationFeet: data?.value != null ? Math.round(data.value) : null,
    source: 'USGS National Map EPQS',
  };
}

// USGS Recent Earthquakes within 100km
async function fetchRecentEarthquakes(lat, lon) {
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=100&starttime=${startDate}&minmagnitude=2.5&limit=10&orderby=magnitude`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const quakes = (data.features || []).map(f => ({
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString().split('T')[0],
    depth: f.geometry?.coordinates?.[2],
  }));
  return {
    count: data.metadata?.count || 0,
    recent: quakes,
    source: 'USGS Earthquake Catalog',
  };
}

// NREL Solar Resource (with DEMO_KEY)
async function fetchSolarData(lat, lon) {
  const url = `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=DEMO_KEY&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const avg = data?.outputs?.avg_dni;
  const ghi = data?.outputs?.avg_ghi;
  return {
    avgDNI: avg?.annual || null,
    avgGHI: ghi?.annual || null,
    monthlyDNI: avg?.monthly || null,
    source: 'NREL Solar Resource API',
  };
}

// NOAA Weather + Alerts
async function fetchNOAAWeather(lat, lon) {
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { 'User-Agent': 'REDevAnalyzer/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!pointRes.ok) return null;
    const pointData = await pointRes.json();
    const props = pointData.properties || {};

    // Also fetch active alerts for the area
    let alerts = [];
    try {
      const alertRes = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
        headers: { 'User-Agent': 'REDevAnalyzer/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        alerts = (alertData.features || []).map(f => ({
          event: f.properties.event,
          severity: f.properties.severity,
          headline: f.properties.headline,
        }));
      }
    } catch {}

    return {
      gridId: props.gridId,
      gridX: props.gridX,
      gridY: props.gridY,
      city: props.relativeLocation?.properties?.city,
      state: props.relativeLocation?.properties?.state,
      timeZone: props.timeZone,
      radarStation: props.radarStation,
      activeAlerts: alerts,
      source: 'NOAA Weather API',
    };
  } catch { return null; }
}

// Check if property is in an Opportunity Zone
async function fetchOpportunityZone(geo) {
  const tracts = geo.census?.['Census Tracts'];
  if (!tracts?.length) return null;
  const tractGeoid = tracts[0].GEOID;
  const stateAbbr = geo.address?.state;

  if (!tractGeoid || !stateAbbr) return null;

  try {
    const url = `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Designated_QOZs_3_14_18/FeatureServer/0/query?where=GEOID%3D%27${tractGeoid}%27&outFields=*&f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const isOZ = data.features?.length > 0;
    return {
      isOpportunityZone: isOZ,
      tractGeoid: tractGeoid,
      details: isOZ ? data.features[0].attributes : null,
      source: 'Designated Qualified Opportunity Zones',
    };
  } catch { return null; }
}

module.exports = { fetchRiskData };
