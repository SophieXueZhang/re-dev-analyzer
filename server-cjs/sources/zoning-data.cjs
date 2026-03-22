// Zoning data: web search + targeted municipal data searches
const { webSearch } = require('./web-search.cjs');

async function fetchZoningData(address, geo) {
  const city = geo.address?.city || '';
  const state = geo.address?.state || '';
  const county = geo.address?.county || '';
  const neighborhood = geo.address?.neighbourhood || geo.address?.suburb || '';
  const postcode = geo.address?.postcode || '';

  console.log('  [zoning] Running 4 targeted searches...');

  const [zoningSearch, codeSearch, localSearch, permitSearch] = await Promise.all([
    webSearch(`"${address}" zoning classification district map ${city} ${state}`, 10),
    webSearch(`${city} ${state} zoning code FAR floor area ratio height limit setback parking requirements ${postcode}`, 8),
    webSearch(`${city} ${state} zoning ordinance permitted uses commercial residential mixed-use ${neighborhood} district regulations`, 8),
    webSearch(`"${address}" OR "${neighborhood} ${city}" building permit development project recent ${state}`, 6),
  ]);

  return {
    zoning: {
      results: zoningSearch.results,
      summary: zoningSearch.summary,
    },
    buildingCode: {
      results: codeSearch.results,
      summary: codeSearch.summary,
    },
    localZoning: {
      results: localSearch.results,
      summary: localSearch.summary,
    },
    permits: {
      results: permitSearch.results,
      summary: permitSearch.summary,
    },
    jurisdiction: { city, state, county, postcode },
    source: 'Web Search (Municipal Records, Zoning Maps)',
  };
}

module.exports = { fetchZoningData };
