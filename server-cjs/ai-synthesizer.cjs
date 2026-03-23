// AI synthesis: combines all real data into structured analysis
const { calculateOverallScore } = require('./scoring.cjs');
const AI_URL = process.env.AI_BASE_URL || 'https://ai-gateway.happycapy.ai/api/v1/chat/completions';
const AI_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'x-ai/grok-3';

async function synthesizeAnalysis(address, geo, propertyData, zoningData, riskData, censusData, language) {
  const context = buildContext(address, geo, propertyData, zoningData, riskData, censusData);

  const langInstruction = language === 'zh'
    ? `\n\nLANGUAGE REQUIREMENT: You MUST write ALL text content in Simplified Chinese (中文). This includes: quickTake, summary fields, descriptions, mitigations, developmentPotential, recentChanges, relevance text, and all other human-readable strings. Keep property addresses, zoning codes, data source names, and numeric values in their original English/format. The JSON keys must remain in English.`
    : '';

  const systemPrompt = `You are a senior US real estate investment analyst. You will be given REAL RESEARCH DATA collected from government APIs, public records, and web searches about a specific property.${langInstruction}

CRITICAL RULES:
1. Base your analysis ONLY on the real data provided. Do NOT invent numbers.
2. If the research provides specific dollar amounts, use those EXACT values.
3. Use Census ACS data for income, home values, vacancy rates, rent - these are REAL government statistics.
4. Use USGS seismic data and elevation for risk assessment - these are REAL measurements.
5. If data is truly unavailable, provide a realistic estimate marked with [Estimated] and explain your reasoning.
6. For cap rate, NOI, and cash-on-cash return: calculate from real data when possible (Census median rent, home values).
7. Cite specific data sources with the source name in parentheses (e.g., "150 ft (per NYC Zoning Resolution)").
8. NEVER leave a field as "N/A" or "Unknown" or "Unknown [Estimated]". For EVERY field you MUST provide either a real value from the data or a specific number estimate marked [Estimated] with reasoning.
9. For zoning: use the DETECTED ZONING CODE provided and the PAGE CONTENT sections carefully - they contain the actual zoning parameters.
10. For comparables: only include real data found in search results. Include address, price, sqft if available.

BUILDING RESTRICTIONS - MANDATORY:
For buildingRestrictions, follow this priority order:
1. FIRST: Check section "11b. PRE-EXTRACTED BUILDING RESTRICTIONS" - these values were extracted by a dedicated deep research AI and are the most reliable. Use them directly.
2. SECOND: Cross-reference with PAGE CONTENT sections (11, 11d) for additional detail or confirmation.
3. THIRD: Use search result snippets for any remaining gaps.
4. LAST RESORT: Provide a reasonable estimate based on the zoning code type and city, marked as [Estimated based on {code} typical standards].
- maxHeight: Provide as "XX feet / X stories (per source)".
- maxFAR: Provide as "X.X (per source)".
- maxLotCoverage: Provide as "XX% (per source)".
- frontSetback: Provide as "XX feet (per source)".
- sideSetback: Provide as "XX feet (per source)".
- rearSetback: Provide as "XX feet (per source)".
- minLotSize: Provide as "X,XXX sq ft (per source)".
- parkingRequirement: Provide as descriptive text with source.
NEVER leave any buildingRestrictions field as "Unknown" or "N/A". Every field must have a specific value.

Respond ONLY with valid JSON (no markdown, no code fences). Use this structure:
{
  "property": {
    "address": "full formatted address",
    "city": "city",
    "state": "state abbreviation",
    "county": "county",
    "neighborhood": "neighborhood"
  },
  "valuation": {
    "estimatedValue": "dollar amount",
    "pricePerSqFt": "$XXX",
    "estimatedSqFt": "from research",
    "lotSize": "from research",
    "capRate": "X.X%",
    "cashOnCashReturn": "X.X%",
    "grossRentMultiplier": "XX.X",
    "noiEstimate": "$XX,XXX/year",
    "estimatedMonthlyRent": "$X,XXX",
    "yearBuilt": "from research",
    "propertyType": "type",
    "comparables": [
      { "address": "real address", "price": "$X", "sqft": "X", "priceSqFt": "$X", "soldDate": "date" }
    ],
    "marketTrend": "appreciating/stable/declining",
    "annualAppreciation": "X.X%",
    "summary": "2-3 sentences with REAL data"
  },
  "risks": [
    { "category": "Market Risk", "level": "low/medium/high", "score": 1-10, "description": "based on real data", "mitigations": ["..."] },
    { "category": "Environmental Risk", "level": "low/medium/high", "score": 1-10, "description": "use USGS/elevation/earthquake data", "mitigations": ["..."] },
    { "category": "Regulatory Risk", "level": "low/medium/high", "score": 1-10, "description": "based on zoning research", "mitigations": ["..."] },
    { "category": "Financial Risk", "level": "low/medium/high", "score": 1-10, "description": "use Census income/vacancy data", "mitigations": ["..."] },
    { "category": "Infrastructure Risk", "level": "low/medium/high", "score": 1-10, "description": "based on area data", "mitigations": ["..."] }
  ],
  "zoning": {
    "classification": "exact code from research",
    "description": "description",
    "permittedUses": ["from research"],
    "conditionalUses": ["from research"],
    "prohibitedUses": ["from research"],
    "buildingRestrictions": {
      "maxHeight": "from research",
      "maxFAR": "from research",
      "maxLotCoverage": "from research",
      "frontSetback": "from research",
      "sideSetback": "from research",
      "rearSetback": "from research",
      "minLotSize": "from research",
      "parkingRequirement": "from research"
    },
    "overlayDistricts": ["from research"],
    "recentChanges": "from research",
    "localCodes": [
      { "code": "code ref", "title": "title", "relevance": "why matters" }
    ],
    "developmentPotential": "analysis"
  },
  "dataSources": ["list all real sources used"],
  "quickTake": "3-4 sentence executive summary with REAL data"
}`;

  const response = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.15,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI synthesis failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let jsonStr = content;
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  const aiResult = JSON.parse(jsonStr.trim());

  // Deterministic scoring: override AI-generated score with weighted formula
  const scoring = calculateOverallScore(aiResult.risks);
  return {
    ...aiResult,
    overallScore: scoring.overallScore,
    investmentGrade: scoring.investmentGrade,
    scoreBreakdown: scoring.scoreBreakdown,
  };
}

function buildContext(address, geo, prop, zoning, risk, census) {
  let ctx = `REAL ESTATE RESEARCH DATA FOR: ${address}\n`;
  ctx += `==========================================\n\n`;

  // --- GEOCODING ---
  ctx += `## 1. GEOCODING & LOCATION (Nominatim + US Census + FCC)\n`;
  ctx += `- Matched: ${geo.matchedAddress || geo.displayName}\n`;
  ctx += `- Coordinates: ${geo.lat}, ${geo.lon}\n`;
  if (geo.propertyName) ctx += `- Property Name: ${geo.propertyName}\n`;
  if (geo.propertyType) ctx += `- OSM Type: ${geo.propertyType}\n`;
  const addr = geo.address || {};
  if (addr.neighbourhood) ctx += `- Neighborhood: ${addr.neighbourhood}\n`;
  if (addr.suburb) ctx += `- Area: ${addr.suburb}\n`;
  if (addr.county) ctx += `- County: ${addr.county}\n`;
  if (addr.city) ctx += `- City: ${addr.city}\n`;
  if (addr.state) ctx += `- State: ${addr.state}\n`;
  if (addr.postcode) ctx += `- ZIP: ${addr.postcode}\n`;
  if (geo.fcc?.countyName) ctx += `- FCC County: ${geo.fcc.countyName}\n`;
  if (geo.fcc?.blockFips) ctx += `- Census Block FIPS: ${geo.fcc.blockFips}\n`;
  const tracts = geo.census?.['Census Tracts'];
  if (tracts?.[0]) ctx += `- Census Tract: ${tracts[0].NAME} (GEOID: ${tracts[0].GEOID})\n`;
  const counties = geo.census?.['Counties'];
  if (counties?.[0]) ctx += `- FIPS County Code: ${counties[0].GEOID}\n`;
  ctx += `\n`;

  // --- CENSUS ACS DATA ---
  if (census?.available) {
    ctx += `## 2. US CENSUS ACS DATA (Real Government Statistics)\n`;
    ctx += `- Census Tract: ${census.tract}\n`;
    if (census.totalPopulation) ctx += `- Population in Tract: ${census.totalPopulation.toLocaleString()}\n`;
    if (census.medianHouseholdIncome) ctx += `- Median Household Income: $${census.medianHouseholdIncome.toLocaleString()}\n`;
    if (census.medianHomeValue) ctx += `- Median Home Value (Census): $${census.medianHomeValue.toLocaleString()}\n`;
    if (census.medianRent) ctx += `- Median Gross Rent: $${census.medianRent.toLocaleString()}/month\n`;
    if (census.totalHousingUnits) ctx += `- Total Housing Units: ${census.totalHousingUnits.toLocaleString()}\n`;
    if (census.vacancyRate) ctx += `- Vacancy Rate: ${census.vacancyRate}\n`;
    if (census.ownerOccupied) ctx += `- Owner-Occupied: ${census.ownerOccupied.toLocaleString()}\n`;
    if (census.renterOccupied) ctx += `- Renter-Occupied: ${census.renterOccupied.toLocaleString()}\n`;
    if (census.medianYearBuilt) ctx += `- Median Year Built: ${census.medianYearBuilt}\n`;
    if (census.medianRooms) ctx += `- Median Rooms: ${census.medianRooms}\n`;
    if (census.medianAge) ctx += `- Median Age: ${census.medianAge}\n`;
    if (census.employmentRate) ctx += `- Employment Rate: ${census.employmentRate}\n`;
    if (census.povertyRate) ctx += `- Poverty Rate: ${census.povertyRate}\n`;
    ctx += `  Source: ${census.source}\n\n`;
  }

  // --- PROPERTY VALUATION ---
  ctx += `## 3. PROPERTY VALUATION DATA (Web Search)\n`;
  if (prop.valuation?.summary) ctx += `AI Summary: ${prop.valuation.summary}\n`;
  if (prop.valuation?.results?.length) {
    ctx += `Search Results:\n`;
    for (const r of prop.valuation.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- PROPERTY DETAILS ---
  if (prop.details?.results?.length) {
    ctx += `## 4. PROPERTY DETAILS (Web Search)\n`;
    if (prop.details.summary) ctx += `AI Summary: ${prop.details.summary}\n`;
    for (const r of prop.details.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
    ctx += `\n`;
  }

  // --- COMPARABLE SALES ---
  ctx += `## 5. COMPARABLE SALES (Web Search)\n`;
  if (prop.comparables?.summary) ctx += `AI Summary: ${prop.comparables.summary}\n`;
  if (prop.comparables?.results?.length) {
    for (const r of prop.comparables.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- RENTAL DATA ---
  if (prop.rental?.results?.length) {
    ctx += `## 6. RENTAL DATA (Web Search)\n`;
    if (prop.rental.summary) ctx += `AI Summary: ${prop.rental.summary}\n`;
    for (const r of prop.rental.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
    ctx += `\n`;
  }

  // --- ZONING ---
  // --- DETECTED ZONING CODE ---
  if (zoning.zoningCode) {
    ctx += `## 7. DETECTED ZONING CODE: ${zoning.zoningCode}\n`;
    ctx += `(This was extracted from search results via AI analysis. Use this code for building restrictions.)\n\n`;
  }

  ctx += `## 8. ZONING CLASSIFICATION (Web Search)\n`;
  if (zoning.zoning?.summary) ctx += `AI Summary: ${zoning.zoning.summary}\n`;
  if (zoning.zoning?.results?.length) {
    for (const r of zoning.zoning.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  ctx += `## 9. BUILDING CODE & RESTRICTIONS - TARGETED SEARCH FOR "${zoning.zoningCode || 'code'}" (Web Search)\n`;
  if (zoning.buildingCode?.summary) ctx += `AI Summary: ${zoning.buildingCode.summary}\n`;
  if (zoning.buildingCode?.results?.length) {
    for (const r of zoning.buildingCode.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- RESTRICTION-SPECIFIC SEARCH ---
  if (zoning.restrictions?.results?.length) {
    ctx += `## 9b. SETBACK & LOT COVERAGE SEARCH FOR "${zoning.zoningCode || 'code'}" (Web Search)\n`;
    if (zoning.restrictions.summary) ctx += `AI Summary: ${zoning.restrictions.summary}\n`;
    for (const r of zoning.restrictions.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
    ctx += `\n`;
  }

  ctx += `## 10. LOCAL ZONING ORDINANCE (Web Search)\n`;
  if (zoning.localZoning?.summary) ctx += `AI Summary: ${zoning.localZoning.summary}\n`;
  if (zoning.localZoning?.results?.length) {
    for (const r of zoning.localZoning.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- SCRAPED PAGE CONTENT (actual zoning code text) ---
  if (zoning.pageContents?.length > 0) {
    ctx += `## 11. ACTUAL PAGE CONTENT FROM ZONING SOURCES (IMPORTANT - contains real building restriction numbers)\n`;
    ctx += `READ THESE CAREFULLY to extract maxHeight, maxFAR, setbacks, lot coverage, parking:\n\n`;
    for (const page of zoning.pageContents) {
      ctx += `### Source: ${page.url}\n`;
      ctx += `${page.content}\n\n`;
    }
  }

  // --- DEEP RESEARCH: Building Restrictions (comprehensive-researcher approach) ---
  if (zoning.deepResearch) {
    const dr = zoning.deepResearch;

    // Pre-extracted building restriction values (HIGH PRIORITY - use these first)
    if (dr.extractedRestrictions) {
      ctx += `## 11b. PRE-EXTRACTED BUILDING RESTRICTIONS (Deep Research AI Analysis - USE THESE VALUES)\n`;
      ctx += `These values were extracted by a dedicated AI analysis of multiple zoning sources. USE THESE as your PRIMARY source for buildingRestrictions:\n`;
      const er = dr.extractedRestrictions;
      if (er.maxHeight) ctx += `- maxHeight: ${er.maxHeight}\n`;
      if (er.maxFAR) ctx += `- maxFAR: ${er.maxFAR}\n`;
      if (er.maxLotCoverage) ctx += `- maxLotCoverage: ${er.maxLotCoverage}\n`;
      if (er.frontSetback) ctx += `- frontSetback: ${er.frontSetback}\n`;
      if (er.sideSetback) ctx += `- sideSetback: ${er.sideSetback}\n`;
      if (er.rearSetback) ctx += `- rearSetback: ${er.rearSetback}\n`;
      if (er.minLotSize) ctx += `- minLotSize: ${er.minLotSize}\n`;
      if (er.parkingRequirement) ctx += `- parkingRequirement: ${er.parkingRequirement}\n`;
      if (er.maxDensity) ctx += `- maxDensity: ${er.maxDensity}\n`;
      if (Array.isArray(er.permittedUses) && er.permittedUses.length > 0) {
        ctx += `- permittedUses: ${er.permittedUses.join(', ')}\n`;
      }
      if (Array.isArray(er.conditionalUses) && er.conditionalUses.length > 0) {
        ctx += `- conditionalUses: ${er.conditionalUses.join(', ')}\n`;
      }
      if (Array.isArray(er.prohibitedUses) && er.prohibitedUses.length > 0) {
        ctx += `- prohibitedUses: ${er.prohibitedUses.join(', ')}\n`;
      }
      ctx += `\n`;
    }

    // Deep research search results by field
    if (dr.searchGroups?.length > 0) {
      ctx += `## 11c. DEEP RESEARCH - FIELD-SPECIFIC SEARCH RESULTS\n`;
      for (const group of dr.searchGroups) {
        ctx += `### ${group.label}:\n`;
        if (group.summary) ctx += `Summary: ${group.summary}\n`;
        for (const r of (group.results || []).slice(0, 3)) {
          ctx += `  - ${r.title}: ${r.description}\n`;
        }
      }
      ctx += `\n`;
    }

    // Deep research page contents
    if (dr.pageContents?.length > 0) {
      ctx += `## 11d. DEEP RESEARCH - ADDITIONAL PAGE CONTENT (contains specific restriction numbers)\n`;
      for (const page of dr.pageContents) {
        ctx += `### Source: ${page.url}\n`;
        ctx += `${page.content}\n\n`;
      }
    }
  }

  // --- PERMITS ---
  if (zoning.permits?.results?.length) {
    ctx += `## 12. RECENT BUILDING PERMITS & DEVELOPMENT (Web Search)\n`;
    if (zoning.permits.summary) ctx += `AI Summary: ${zoning.permits.summary}\n`;
    for (const r of zoning.permits.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
    ctx += `\n`;
  }

  // --- RISK: SEISMIC ---
  if (risk.seismic) {
    ctx += `## 13. SEISMIC DATA (USGS ASCE 7-22 - Real Measurements)\n`;
    ctx += `- Ss (short-period acceleration): ${risk.seismic.ss}g\n`;
    ctx += `- S1 (1-sec acceleration): ${risk.seismic.s1}g\n`;
    ctx += `- SDS (design short-period): ${risk.seismic.sds}g\n`;
    ctx += `- SD1 (design 1-sec): ${risk.seismic.sd1}g\n`;
    if (risk.seismic.seismicDesignCategory) ctx += `- Seismic Design Category: ${risk.seismic.seismicDesignCategory}\n`;
    ctx += `  Source: ${risk.seismic.source}\n\n`;
  }

  // --- RISK: ELEVATION ---
  if (risk.elevation) {
    ctx += `## 14. ELEVATION DATA (USGS National Map)\n`;
    ctx += `- Ground Elevation: ${risk.elevation.elevationFeet} feet\n`;
    ctx += `  Source: ${risk.elevation.source}\n\n`;
  }

  // --- RISK: EARTHQUAKES ---
  if (risk.earthquakes && risk.earthquakes.count > 0) {
    ctx += `## 15. RECENT EARTHQUAKES WITHIN 100km (USGS)\n`;
    ctx += `- Total M2.5+ in past year: ${risk.earthquakes.count}\n`;
    for (const q of risk.earthquakes.recent.slice(0, 5)) {
      ctx += `  - M${q.magnitude} on ${q.time}: ${q.place} (depth: ${q.depth}km)\n`;
    }
    ctx += `  Source: ${risk.earthquakes.source}\n\n`;
  }

  // --- SOLAR ---
  if (risk.solar) {
    ctx += `## 16. SOLAR RESOURCE (NREL)\n`;
    if (risk.solar.avgDNI) ctx += `- Avg Direct Normal Irradiance: ${risk.solar.avgDNI} kWh/m2/day\n`;
    if (risk.solar.avgGHI) ctx += `- Avg Global Horizontal: ${risk.solar.avgGHI} kWh/m2/day\n`;
    ctx += `  Source: ${risk.solar.source}\n\n`;
  }

  // --- WEATHER ---
  if (risk.weather) {
    ctx += `## 17. WEATHER & ALERTS (NOAA)\n`;
    ctx += `- Grid: ${risk.weather.gridId}\n`;
    ctx += `- Timezone: ${risk.weather.timeZone}\n`;
    if (risk.weather.activeAlerts?.length > 0) {
      ctx += `- ACTIVE WEATHER ALERTS:\n`;
      for (const a of risk.weather.activeAlerts) {
        ctx += `  - ${a.event} (${a.severity}): ${a.headline}\n`;
      }
    } else {
      ctx += `- No active weather alerts\n`;
    }
    ctx += `  Source: ${risk.weather.source}\n\n`;
  }

  // --- OPPORTUNITY ZONE ---
  if (risk.opportunityZone) {
    ctx += `## 18. OPPORTUNITY ZONE STATUS\n`;
    ctx += `- Is Qualified Opportunity Zone: ${risk.opportunityZone.isOpportunityZone ? 'YES' : 'NO'}\n`;
    ctx += `- Census Tract: ${risk.opportunityZone.tractGeoid}\n`;
    ctx += `  Source: ${risk.opportunityZone.source}\n\n`;
  }

  // --- ENVIRONMENTAL SEARCH ---
  ctx += `## 19. ENVIRONMENTAL & HAZARD SEARCH (Web Search)\n`;
  if (risk.envSearch?.summary) ctx += `AI Summary: ${risk.envSearch.summary}\n`;
  if (risk.envSearch?.results?.length) {
    for (const r of risk.envSearch.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- MARKET SEARCH ---
  ctx += `## 20. MARKET CONDITIONS (Web Search)\n`;
  if (risk.marketSearch?.summary) ctx += `AI Summary: ${risk.marketSearch.summary}\n`;
  if (risk.marketSearch?.results?.length) {
    for (const r of risk.marketSearch.results) {
      ctx += `  - [${r.title}](${r.url}): ${r.description}\n`;
    }
  }
  ctx += `\n`;

  // --- JURISDICTION ---
  ctx += `## LOCATION CONTEXT\n`;
  ctx += `- Jurisdiction: ${zoning.jurisdiction?.city}, ${zoning.jurisdiction?.state}\n`;
  ctx += `- County: ${zoning.jurisdiction?.county}\n`;
  ctx += `- ZIP: ${zoning.jurisdiction?.postcode}\n`;
  if (prop.geo?.censusTract) ctx += `- Census Tract: ${prop.geo.censusTract.name}\n`;
  ctx += `\n`;

  ctx += `INSTRUCTIONS: Synthesize ALL the above real data into the JSON analysis. Use actual numbers from Census ACS, USGS, NREL, and web search results. Calculate cap rate, NOI, and GRM from real Census median rent and home values when property-specific data isn't available. Mark estimates with [Estimated]. NEVER use "N/A" if you can calculate or estimate from available data.`;

  return ctx;
}

module.exports = { synthesizeAnalysis };
