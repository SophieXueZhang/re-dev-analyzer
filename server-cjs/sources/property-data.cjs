// Property data: web search + scraping key details from search results
const { webSearch } = require('./web-search.cjs');

async function fetchPropertyData(address, geo) {
  const city = geo.address?.city || '';
  const state = geo.address?.state || '';
  const county = geo.address?.county || '';
  const neighborhood = geo.address?.neighbourhood || geo.address?.suburb || '';

  console.log('  [property] Running 4 targeted searches...');

  const [valuationSearch, salesSearch, rentSearch, detailSearch] = await Promise.all([
    webSearch(`"${address}" property value assessment tax record Zillow Redfin Realtor.com`, 10),
    webSearch(`"${address}" OR "${city} ${state}" comparable sales recently sold price per sqft ${neighborhood}`, 8),
    webSearch(`"${address}" OR "${neighborhood} ${city}" rent estimate rental price apartment lease ${state}`, 8),
    webSearch(`"${address}" square feet lot size year built bedrooms property details ${city}`, 8),
  ]);

  return {
    valuation: {
      results: valuationSearch.results,
      summary: valuationSearch.summary,
    },
    comparables: {
      results: salesSearch.results,
      summary: salesSearch.summary,
    },
    rental: {
      results: rentSearch.results,
      summary: rentSearch.summary,
    },
    details: {
      results: detailSearch.results,
      summary: detailSearch.summary,
    },
    geo: {
      name: geo.propertyName,
      type: geo.propertyType,
      neighborhood,
      county,
      city,
      state,
      postcode: geo.address?.postcode || null,
      censusTract: extractTract(geo),
    },
    source: 'Web Search (Zillow, Redfin, Realtor.com, Public Records)',
  };
}

function extractTract(geo) {
  const tracts = geo.census?.['Census Tracts'];
  if (tracts?.length) {
    return { geoid: tracts[0].GEOID, tract: tracts[0].TRACT, name: tracts[0].NAME };
  }
  return null;
}

module.exports = { fetchPropertyData };
