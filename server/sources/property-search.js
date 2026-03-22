import { webSearch } from './web-search.js';

export async function searchPropertyData(address, geoData) {
  // Run multiple targeted searches in parallel for comprehensive real data
  const [valuationSearch, salesSearch] = await Promise.all([
    webSearch(`"${address}" property value assessment tax Zillow Redfin`, 8),
    webSearch(`"${address}" comparable sales nearby sold price per sqft`, 6),
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
    geo: {
      name: geoData.propertyName,
      type: geoData.propertyType,
      neighborhood: geoData.address?.neighbourhood || geoData.address?.suburb || null,
      county: geoData.address?.county || null,
      city: geoData.address?.city || null,
      state: geoData.address?.state || null,
      postcode: geoData.address?.postcode || null,
      censusTract: getCensusTract(geoData),
    },
  };
}

function getCensusTract(geoData) {
  const tracts = geoData.census?.['Census Tracts'];
  if (tracts && tracts.length) {
    return {
      geoid: tracts[0].GEOID,
      tract: tracts[0].TRACT,
      name: tracts[0].NAME,
    };
  }
  return null;
}
