// Zoning data: multi-phase approach with deep research
// Phase 1: Web search to identify zoning classification
// Phase 2: AI extracts zoning code -> targeted search for that code's specific parameters
// Phase 3: Fetch actual page content from top results for detailed restrictions
// Phase 4: Deep research (comprehensive-researcher) for specific building restriction values
const { webSearch } = require('./web-search.cjs');
const { deepZoningResearch } = require('./deep-zoning-research.cjs');

const AI_URL = process.env.AI_BASE_URL || 'https://ai-gateway.happycapy.ai/api/v1/chat/completions';
const AI_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'x-ai/grok-3';

async function fetchZoningData(address, geo) {
  const city = geo.address?.city || '';
  const state = geo.address?.state || '';
  const county = geo.address?.county || '';
  const neighborhood = geo.address?.neighbourhood || geo.address?.suburb || '';
  const postcode = geo.address?.postcode || '';

  // ===== PHASE 1: Initial broad searches =====
  console.log('  [zoning] Phase 1: Broad zoning searches...');
  const [zoningSearch, permitSearch] = await Promise.all([
    webSearch(`"${address}" zoning classification district map ${city} ${state}`, 10),
    webSearch(`"${address}" OR "${neighborhood} ${city}" building permit development project recent ${state}`, 6),
  ]);

  // ===== PHASE 2: Extract zoning code with quick AI call =====
  console.log('  [zoning] Phase 2: Extracting zoning code...');
  const zoningCode = await extractZoningCode(address, city, state, zoningSearch);
  console.log(`  [zoning] Detected zoning code: ${zoningCode || 'unknown'}`);

  // ===== PHASE 3: Targeted search for that specific code's parameters =====
  console.log('  [zoning] Phase 3: Targeted building restriction searches...');
  const codeForSearch = zoningCode || `${neighborhood} ${postcode}`;

  const [codeSearch, restrictionSearch, localSearch] = await Promise.all([
    webSearch(`${city} ${state} zoning "${codeForSearch}" maximum height FAR floor area ratio setback parking requirements`, 10),
    webSearch(`${city} ${state} "${codeForSearch}" zoning lot coverage rear setback side setback front setback minimum lot size`, 8),
    webSearch(`${city} ${state} zoning ordinance "${codeForSearch}" permitted uses conditional uses development standards`, 8),
  ]);

  // ===== PHASE 4: Fetch actual page content from top zoning results =====
  console.log('  [zoning] Phase 4: Fetching page content for details...');
  const pageContents = await fetchTopPages([
    ...codeSearch.results.slice(0, 3),
    ...restrictionSearch.results.slice(0, 2),
    ...zoningSearch.results.slice(0, 2),
  ]);

  // ===== PHASE 5: Deep research using comprehensive-researcher approach =====
  let deepResearch = null;
  if (zoningCode) {
    console.log('  [zoning] Phase 5: Deep research for building restrictions...');
    try {
      deepResearch = await deepZoningResearch(address, city, state, zoningCode);
      if (deepResearch) {
        console.log(`  [zoning] Deep research complete: ${deepResearch.pageContents?.length || 0} pages, extracted: ${deepResearch.extractedRestrictions ? 'yes' : 'no'}`);
      }
    } catch (e) {
      console.warn('  [zoning] Deep research failed:', e.message);
    }
  }

  return {
    zoningCode,
    zoning: {
      results: zoningSearch.results,
      summary: zoningSearch.summary,
    },
    buildingCode: {
      results: codeSearch.results,
      summary: codeSearch.summary,
    },
    restrictions: {
      results: restrictionSearch.results,
      summary: restrictionSearch.summary,
    },
    localZoning: {
      results: localSearch.results,
      summary: localSearch.summary,
    },
    permits: {
      results: permitSearch.results,
      summary: permitSearch.summary,
    },
    pageContents,
    deepResearch,
    jurisdiction: { city, state, county, postcode },
    source: 'Web Search + Page Content + Deep Research',
  };
}

// Quick AI call to extract zoning code from search results
async function extractZoningCode(address, city, state, searchResults) {
  if (!AI_KEY) return null;

  const snippets = (searchResults.results || [])
    .slice(0, 8)
    .map(r => `${r.title}: ${r.description}`)
    .join('\n');

  if (!snippets) return null;

  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You extract US zoning classification codes from search results. Respond with ONLY the zoning code (e.g., "C5-3", "R-1", "SF-3", "MU-2", "B-2", "I-1"). If multiple codes apply, pick the most specific one for the property. If no code is found, respond with just "UNKNOWN".',
          },
          {
            role: 'user',
            content: `Property: ${address}, ${city}, ${state}\n\nSearch results:\n${snippets}\n\nWhat is the zoning classification code for this property?`,
          },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const code = data.choices?.[0]?.message?.content?.trim();
    if (!code || code === 'UNKNOWN' || code.length > 30) return null;
    return code;
  } catch {
    return null;
  }
}

// Fetch actual page content from top search result URLs
async function fetchTopPages(results) {
  const uniqueUrls = [];
  const seen = new Set();
  for (const r of results) {
    if (r.url && !seen.has(r.url)) {
      seen.add(r.url);
      uniqueUrls.push(r.url);
    }
    if (uniqueUrls.length >= 5) break;
  }

  const pages = await Promise.allSettled(
    uniqueUrls.map(url => fetchPageContent(url))
  );

  return pages
    .filter(p => p.status === 'fulfilled' && p.value)
    .map(p => p.value);
}

// Fetch a single page and extract text content relevant to zoning/building
async function fetchPageContent(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; REDevAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    const html = await res.text();

    // Strip HTML tags and extract text
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract only zoning-relevant portions (look for keywords)
    const keywords = [
      'FAR', 'floor area ratio', 'height', 'setback', 'lot coverage',
      'parking', 'zoning', 'district', 'permitted', 'conditional',
      'prohibited', 'restriction', 'building code', 'overlay',
      'feet', 'stories', 'density', 'minimum lot', 'maximum',
      'front yard', 'rear yard', 'side yard',
    ];

    // Split into sentences and keep relevant ones
    const sentences = text.split(/[.!?]\s+/);
    const relevant = sentences.filter(s => {
      const lower = s.toLowerCase();
      return keywords.some(kw => lower.includes(kw.toLowerCase()));
    });

    const extracted = relevant.join('. ').substring(0, 3000);

    if (extracted.length < 50) return null;

    return {
      url,
      content: extracted,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchZoningData };
