// Deep zoning research using comprehensive-researcher approach:
// Multiple targeted web searches + AI extraction for each building restriction field
const { webSearch } = require('./web-search.cjs');

const AI_URL = process.env.AI_BASE_URL || 'https://ai-gateway.happycapy.ai/api/v1/chat/completions';
const AI_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'x-ai/grok-3';

// Run deep research specifically for building restrictions
// Called AFTER initial zoning code is detected
async function deepZoningResearch(address, city, state, zoningCode) {
  if (!zoningCode || !AI_KEY) return null;

  console.log(`  [deep-research] Researching ${zoningCode} in ${city}, ${state}...`);

  // Phase 1: Generate specific research queries for each restriction field
  const queries = buildResearchQueries(city, state, zoningCode);

  // Phase 2: Run all searches in parallel (8 targeted searches)
  const searchResults = await Promise.allSettled(
    queries.map(q => webSearch(q.query, q.count || 8))
  );

  // Phase 3: Fetch page content from most relevant results
  const allResults = [];
  for (let i = 0; i < searchResults.length; i++) {
    if (searchResults[i].status === 'fulfilled') {
      const sr = searchResults[i].value;
      allResults.push({
        field: queries[i].field,
        label: queries[i].label,
        results: sr.results,
        summary: sr.summary,
      });
    }
  }

  // Phase 4: Fetch top pages from the most promising results
  const pagesToFetch = [];
  const seenUrls = new Set();
  for (const group of allResults) {
    for (const r of (group.results || []).slice(0, 2)) {
      if (r.url && !seenUrls.has(r.url) && isZoningRelevantUrl(r.url)) {
        seenUrls.add(r.url);
        pagesToFetch.push(r.url);
      }
    }
    if (pagesToFetch.length >= 6) break;
  }

  const pageResults = await Promise.allSettled(
    pagesToFetch.map(url => fetchZoningPage(url))
  );

  const pages = pageResults
    .filter(p => p.status === 'fulfilled' && p.value)
    .map(p => p.value);

  // Phase 5: Use AI to extract specific building restriction values
  console.log(`  [deep-research] Extracting values from ${pages.length} pages + ${allResults.length} search groups...`);
  const extracted = await extractBuildingRestrictions(city, state, zoningCode, allResults, pages);

  return {
    zoningCode,
    searchGroups: allResults,
    pageContents: pages,
    extractedRestrictions: extracted,
    source: 'Deep Zoning Research (comprehensive-researcher)',
  };
}

function buildResearchQueries(city, state, code) {
  return [
    {
      field: 'maxHeight',
      label: 'Maximum Height',
      query: `"${code}" ${city} ${state} zoning maximum building height limit feet stories`,
      count: 8,
    },
    {
      field: 'maxFAR',
      label: 'Floor Area Ratio',
      query: `"${code}" ${city} ${state} floor area ratio FAR maximum bulk regulations`,
      count: 8,
    },
    {
      field: 'setbacks',
      label: 'Setback Requirements',
      query: `"${code}" ${city} ${state} setback requirements front yard side yard rear yard feet`,
      count: 8,
    },
    {
      field: 'lotCoverage',
      label: 'Lot Coverage',
      query: `"${code}" ${city} ${state} maximum lot coverage building coverage impervious percentage`,
      count: 6,
    },
    {
      field: 'parking',
      label: 'Parking Requirements',
      query: `"${code}" ${city} ${state} off-street parking requirement spaces per unit dwelling`,
      count: 6,
    },
    {
      field: 'lotSize',
      label: 'Minimum Lot Size',
      query: `"${code}" ${city} ${state} minimum lot size area width frontage requirements`,
      count: 6,
    },
    {
      field: 'permittedUses',
      label: 'Permitted Uses',
      query: `"${code}" ${city} ${state} permitted uses by-right allowed conditional special exception`,
      count: 6,
    },
    {
      field: 'density',
      label: 'Density Standards',
      query: `"${code}" ${city} ${state} density units per acre dwelling units development standards`,
      count: 6,
    },
  ];
}

function isZoningRelevantUrl(url) {
  const lower = url.toLowerCase();
  // Prefer municipal/government and zoning reference sites
  const good = ['.gov', 'zoning', 'municode', 'code.', 'ordinance', 'planning',
    'propertyshark', 'fontan', 'vinculum', 'law.cornell', 'ecode360'];
  return good.some(kw => lower.includes(kw));
}

async function fetchZoningPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; REDevAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;

    const html = await res.text();
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract zoning-relevant sentences
    const keywords = [
      'FAR', 'floor area ratio', 'height', 'setback', 'lot coverage',
      'parking', 'zoning', 'permitted', 'conditional', 'prohibited',
      'feet', 'stories', 'density', 'minimum lot', 'maximum',
      'front yard', 'rear yard', 'side yard', 'impervious',
      'dwelling unit', 'per acre', 'building coverage',
    ];

    const sentences = text.split(/[.!?]\s+/);
    const relevant = sentences.filter(s => {
      const lower = s.toLowerCase();
      return keywords.some(kw => lower.includes(kw.toLowerCase()));
    });

    const extracted = relevant.join('. ').substring(0, 4000);
    if (extracted.length < 50) return null;

    return { url, content: extracted };
  } catch {
    return null;
  }
}

// AI call to extract specific building restriction values from all gathered data
async function extractBuildingRestrictions(city, state, code, searchGroups, pages) {
  if (!AI_KEY) return null;

  let context = `ZONING CODE: ${code} in ${city}, ${state}\n\n`;

  // Add search results by field
  for (const group of searchGroups) {
    context += `=== ${group.label} ===\n`;
    if (group.summary) context += `Summary: ${group.summary}\n`;
    for (const r of (group.results || []).slice(0, 5)) {
      context += `- ${r.title}: ${r.description}\n`;
    }
    context += '\n';
  }

  // Add page content
  if (pages.length > 0) {
    context += `=== ACTUAL PAGE CONTENT (contains real numbers) ===\n`;
    for (const p of pages) {
      context += `[${p.url}]:\n${p.content}\n\n`;
    }
  }

  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You extract specific building restriction values from zoning research data. For zoning code "${code}" in ${city}, ${state}, extract EXACT values from the data provided. Respond with ONLY valid JSON (no markdown). Every field MUST have a value - use the data provided. If you find a specific number, include the source. If not found in data, provide a reasonable estimate marked [Estimated].`,
          },
          {
            role: 'user',
            content: context + '\n\nExtract building restrictions as JSON:\n{"maxHeight":"","maxFAR":"","maxLotCoverage":"","frontSetback":"","sideSetback":"","rearSetback":"","minLotSize":"","parkingRequirement":"","maxDensity":"","permittedUses":[],"conditionalUses":[],"prohibitedUses":[]}',
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    let jsonStr = content;
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1];
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.warn('  [deep-research] Extraction failed:', e.message);
    return null;
  }
}

module.exports = { deepZoningResearch };
