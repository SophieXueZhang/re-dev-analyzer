import { webSearch } from './web-search.js';

export async function searchRiskData(address, geoData) {
  const city = geoData.address?.city || '';
  const state = geoData.address?.state || '';

  // Run environmental and market risk searches in parallel
  const [envSearch, marketSearch] = await Promise.all([
    webSearch(`"${address}" flood zone environmental risk hazard FEMA ${city} ${state}`, 6),
    webSearch(`${city} ${state} real estate market trend 2025 2026 vacancy rate rent growth`, 6),
  ]);

  return {
    environmental: {
      results: envSearch.results,
      summary: envSearch.summary,
    },
    market: {
      results: marketSearch.results,
      summary: marketSearch.summary,
    },
  };
}
