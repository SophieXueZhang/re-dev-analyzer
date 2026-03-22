// Web search with multiple provider support
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const WORKER_BASE = process.env.AGENT_WORKER_BASE_URL;
const WORKER_SECRET = process.env.AGENT_WORKER_SECRET;
const FLY_APP_NAME = process.env.FLY_APP_NAME || '';
const SERP_API_KEY = process.env.SERP_API_KEY;

async function webSearch(query, count = 10) {
  if (WORKER_BASE && WORKER_SECRET) return workerSearch(query, count);
  if (BRAVE_API_KEY) return braveSearch(query, count);
  if (SERP_API_KEY) return serpSearch(query, count);
  console.warn('  [web-search] No search provider configured');
  return { results: [], summary: null };
}

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
      console.warn(`  [worker-search] ${res.status}`);
      return { results: [], summary: null };
    }
    const data = await res.json();
    return {
      results: (data.results || []).map(r => ({
        title: r.title, url: r.url, description: r.description, age: r.age,
      })),
      summary: data.summary?.text || null,
    };
  } catch (err) {
    console.warn(`  [worker-search] ${err.message}`);
    return { results: [], summary: null };
  }
}

async function braveSearch(query, count) {
  const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
    q: query, count: String(Math.min(count, 20)),
  })}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY },
    });
    if (!res.ok) return { results: [], summary: null };
    const data = await res.json();
    return {
      results: (data.web?.results || []).map(r => ({
        title: r.title, url: r.url, description: r.description,
      })),
      summary: null,
    };
  } catch { return { results: [], summary: null }; }
}

async function serpSearch(query, count) {
  const url = `https://serpapi.com/search.json?${new URLSearchParams({
    q: query, api_key: SERP_API_KEY, num: String(Math.min(count, 10)),
  })}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { results: [], summary: null };
    const data = await res.json();
    return {
      results: (data.organic_results || []).map(r => ({
        title: r.title, url: r.link, description: r.snippet,
      })),
      summary: null,
    };
  } catch { return { results: [], summary: null }; }
}

module.exports = { webSearch };
