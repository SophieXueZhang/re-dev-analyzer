// Web search with multiple provider support:
// 1. Brave Search API (free tier: 2000 queries/month) - set BRAVE_API_KEY
// 2. HappyCapy Worker API (sandbox-only) - set AGENT_WORKER_BASE_URL + AGENT_WORKER_SECRET
// 3. SerpAPI - set SERP_API_KEY
// Falls back gracefully if no search provider is configured.

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const WORKER_BASE = process.env.AGENT_WORKER_BASE_URL;
const WORKER_SECRET = process.env.AGENT_WORKER_SECRET;
const FLY_APP_NAME = process.env.FLY_APP_NAME || '';
const SERP_API_KEY = process.env.SERP_API_KEY;

export async function webSearch(query, count = 10) {
  // Try providers in order of preference
  if (BRAVE_API_KEY) return braveSearch(query, count);
  if (WORKER_BASE && WORKER_SECRET) return workerSearch(query, count);
  if (SERP_API_KEY) return serpSearch(query, count);

  console.warn('  [web-search] No search API configured. Set BRAVE_API_KEY (free: https://brave.com/search/api/) or SERP_API_KEY');
  return { results: [], summary: null };
}

// Brave Search API - free tier: 2000 queries/month
// Sign up: https://brave.com/search/api/
async function braveSearch(query, count) {
  const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
    q: query,
    count: String(Math.min(count, 20)),
  })}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      console.warn(`  [brave-search] Failed: ${res.status}`);
      return { results: [], summary: null };
    }

    const data = await res.json();
    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age,
    }));

    return { results, summary: null };
  } catch (err) {
    console.warn(`  [brave-search] Error: ${err.message}`);
    return { results: [], summary: null };
  }
}

// HappyCapy Worker API (sandbox environment)
async function workerSearch(query, count) {
  const url = `${WORKER_BASE}/api/tool/web-search`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
        ...(FLY_APP_NAME ? { 'X-Sandbox-Id': FLY_APP_NAME } : {}),
      },
      body: JSON.stringify({ query, count, summary: true }),
    });

    if (!res.ok) {
      console.warn(`  [worker-search] Failed: ${res.status}`);
      return { results: [], summary: null };
    }

    const data = await res.json();
    return {
      results: (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        age: r.age,
      })),
      summary: data.summary?.text || null,
    };
  } catch (err) {
    console.warn(`  [worker-search] Error: ${err.message}`);
    return { results: [], summary: null };
  }
}

// SerpAPI (free tier: 100 searches/month)
async function serpSearch(query, count) {
  const url = `https://serpapi.com/search.json?${new URLSearchParams({
    q: query,
    api_key: SERP_API_KEY,
    num: String(Math.min(count, 10)),
  })}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  [serp-search] Failed: ${res.status}`);
      return { results: [], summary: null };
    }

    const data = await res.json();
    const results = (data.organic_results || []).map(r => ({
      title: r.title,
      url: r.link,
      description: r.snippet,
    }));

    return { results, summary: null };
  } catch (err) {
    console.warn(`  [serp-search] Error: ${err.message}`);
    return { results: [], summary: null };
  }
}
