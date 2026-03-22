import { webSearch } from './web-search.js';

export async function searchZoningData(address, geoData) {
  const city = geoData.address?.city || '';
  const state = geoData.address?.state || '';
  const county = geoData.address?.county || '';
  const neighborhood = geoData.address?.neighbourhood || geoData.address?.suburb || '';

  // Run multiple targeted zoning searches in parallel for comprehensive coverage
  const [zoningSearch, codeSearch, localZoningSearch] = await Promise.all([
    webSearch(`"${address}" zoning classification district permitted uses building code`, 8),
    webSearch(`${address} zoning map FAR floor area ratio height limit setback parking ${city}`, 6),
    webSearch(`${city} ${state} zoning code ${neighborhood} commercial residential district regulations`, 6),
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
      results: localZoningSearch.results,
      summary: localZoningSearch.summary,
    },
    jurisdiction: { city, state, county },
  };
}
