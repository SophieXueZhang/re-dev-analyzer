// AI API - supports OpenRouter, HappyCapy Gateway, or any OpenAI-compatible endpoint
const AI_URL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const AI_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'x-ai/grok-3';

export async function synthesizeAnalysis(address, geoData, propertyData, zoningData, riskData) {
  const realDataContext = buildContext(address, geoData, propertyData, zoningData, riskData);

  const systemPrompt = `You are a senior US real estate investment analyst. You will be given REAL RESEARCH DATA collected from public records, property databases, and web searches about a specific property. Your job is to synthesize this real data into a structured investment analysis.

CRITICAL RULES:
1. Base your analysis ONLY on the real data provided. Do NOT invent numbers.
2. If the research provides specific dollar amounts, tax assessments, square footage, or zoning codes, USE THOSE EXACT VALUES.
3. If a data point is not available in the research, mark it as "N/A" or provide your best estimate clearly labeled as "[Estimated]".
4. Cite your data sources where possible (e.g., "per PropertyShark" or "per Zillow").
5. For comparable sales, only include them if real data was found. Otherwise use an empty array.

Respond ONLY with valid JSON (no markdown, no code fences). Use this structure:
{
  "property": {
    "address": "full formatted address from research",
    "city": "city",
    "state": "state abbreviation",
    "county": "county",
    "neighborhood": "neighborhood"
  },
  "valuation": {
    "estimatedValue": "dollar amount from research or [Estimated] $X",
    "pricePerSqFt": "$XXX or [Estimated]",
    "estimatedSqFt": "from research",
    "lotSize": "from research",
    "capRate": "X.X% or [Estimated]",
    "cashOnCashReturn": "X.X% or [Estimated]",
    "grossRentMultiplier": "XX.X or [Estimated]",
    "noiEstimate": "$XX,XXX/year or [Estimated]",
    "estimatedMonthlyRent": "$X,XXX or [Estimated]",
    "yearBuilt": "from research",
    "propertyType": "from research",
    "comparables": [
      { "address": "real address", "price": "$X", "sqft": "X", "priceSqFt": "$X", "soldDate": "date" }
    ],
    "marketTrend": "appreciating/stable/declining - based on research",
    "annualAppreciation": "X.X% based on research",
    "summary": "2-3 sentences using REAL data points"
  },
  "risks": [
    {
      "category": "Market Risk",
      "level": "low/medium/high",
      "score": 1-10,
      "description": "based on real market data from research",
      "mitigations": ["strategy 1", "strategy 2"]
    },
    {
      "category": "Environmental Risk",
      "level": "low/medium/high",
      "score": 1-10,
      "description": "based on real FEMA/environmental data",
      "mitigations": ["strategy 1", "strategy 2"]
    },
    {
      "category": "Regulatory Risk",
      "level": "low/medium/high",
      "score": 1-10,
      "description": "based on real zoning/regulatory research",
      "mitigations": ["strategy 1", "strategy 2"]
    },
    {
      "category": "Financial Risk",
      "level": "low/medium/high",
      "score": 1-10,
      "description": "based on research data",
      "mitigations": ["strategy 1", "strategy 2"]
    },
    {
      "category": "Infrastructure Risk",
      "level": "low/medium/high",
      "score": 1-10,
      "description": "based on research data",
      "mitigations": ["strategy 1", "strategy 2"]
    }
  ],
  "zoning": {
    "classification": "EXACT code from research (e.g. C5-3, R-1)",
    "description": "from research",
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
      { "code": "real code ref", "title": "title", "relevance": "why it matters" }
    ],
    "developmentPotential": "analysis based on real zoning data"
  },
  "dataSources": ["list of real sources used"],
  "overallScore": 1-100,
  "investmentGrade": "A+/A/A-/B+/B/B-/C+/C/C-/D",
  "quickTake": "3-4 sentence executive summary referencing REAL data points"
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
        { role: 'user', content: realDataContext },
      ],
      temperature: 0.2,
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

  return JSON.parse(jsonStr.trim());
}

function buildContext(address, geoData, propertyData, zoningData, riskData) {
  let ctx = `REAL ESTATE RESEARCH DATA FOR: ${address}\n`;
  ctx += `==========================================\n\n`;

  // Geocoding data
  ctx += `## GEOCODING & LOCATION DATA (Source: Nominatim + US Census)\n`;
  ctx += `- Matched Address: ${geoData.matchedAddress || geoData.displayName}\n`;
  ctx += `- Coordinates: ${geoData.lat}, ${geoData.lon}\n`;
  if (geoData.propertyName) ctx += `- Property Name: ${geoData.propertyName}\n`;
  if (geoData.propertyType) ctx += `- OSM Property Type: ${geoData.propertyType}\n`;
  const addr = geoData.address;
  if (addr.neighbourhood) ctx += `- Neighborhood: ${addr.neighbourhood}\n`;
  if (addr.suburb) ctx += `- Area: ${addr.suburb}\n`;
  if (addr.county) ctx += `- County: ${addr.county}\n`;
  if (addr.city) ctx += `- City: ${addr.city}\n`;
  if (addr.state) ctx += `- State: ${addr.state}\n`;
  if (addr.postcode) ctx += `- ZIP: ${addr.postcode}\n`;

  // Census data
  const census = geoData.census;
  if (census['Census Tracts']?.[0]) {
    ctx += `- Census Tract: ${census['Census Tracts'][0].NAME} (GEOID: ${census['Census Tracts'][0].GEOID})\n`;
  }
  if (census['Counties']?.[0]) {
    ctx += `- FIPS County Code: ${census['Counties'][0].GEOID}\n`;
  }
  ctx += `\n`;

  // Property valuation data from web search
  ctx += `## PROPERTY VALUATION DATA (Source: Web Search - Zillow, PropertyShark, Public Records)\n`;
  if (propertyData.valuation.summary) {
    ctx += `### AI Summary of Search Results:\n${propertyData.valuation.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of propertyData.valuation.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  // Comparable sales data
  ctx += `## COMPARABLE SALES DATA (Source: Web Search)\n`;
  if (propertyData.comparables.summary) {
    ctx += `### AI Summary:\n${propertyData.comparables.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of propertyData.comparables.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  // Zoning data
  ctx += `## ZONING DATA (Source: Web Search - City Records, Zoning Maps)\n`;
  if (zoningData.zoning.summary) {
    ctx += `### AI Summary:\n${zoningData.zoning.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of zoningData.zoning.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  // Building code data
  ctx += `## BUILDING CODE & RESTRICTIONS (Source: Web Search)\n`;
  if (zoningData.buildingCode.summary) {
    ctx += `### AI Summary:\n${zoningData.buildingCode.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of zoningData.buildingCode.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  // Local zoning context
  if (zoningData.localZoning) {
    ctx += `## LOCAL ZONING CONTEXT (Source: Web Search - City/County Zoning Resources)\n`;
    if (zoningData.localZoning.summary) {
      ctx += `### AI Summary:\n${zoningData.localZoning.summary}\n\n`;
    }
    ctx += `### Raw Search Results:\n`;
    for (const r of zoningData.localZoning.results) {
      ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
    }
    ctx += `\n`;
  }

  // Risk data
  ctx += `## ENVIRONMENTAL & HAZARD DATA (Source: Web Search - FEMA, Environmental Records)\n`;
  if (riskData.environmental.summary) {
    ctx += `### AI Summary:\n${riskData.environmental.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of riskData.environmental.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  ctx += `## MARKET CONDITIONS (Source: Web Search - Market Reports)\n`;
  if (riskData.market.summary) {
    ctx += `### AI Summary:\n${riskData.market.summary}\n\n`;
  }
  ctx += `### Raw Search Results:\n`;
  for (const r of riskData.market.results) {
    ctx += `- [${r.title}](${r.url}): ${r.description}\n`;
  }
  ctx += `\n`;

  ctx += `## LOCATION CONTEXT\n`;
  ctx += `- Jurisdiction: ${zoningData.jurisdiction.city}, ${zoningData.jurisdiction.state}\n`;
  ctx += `- County: ${zoningData.jurisdiction.county}\n`;
  if (propertyData.geo.censusTract) {
    ctx += `- Census Tract: ${propertyData.geo.censusTract.name}\n`;
  }
  ctx += `\n`;

  ctx += `INSTRUCTIONS: Synthesize ALL the above real data into the structured JSON analysis. Use the actual numbers, codes, and facts found in the research. Mark any estimates clearly with [Estimated].`;

  return ctx;
}
