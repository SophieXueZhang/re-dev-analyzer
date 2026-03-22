# RE Dev Analyzer

US Real Estate Investment Intelligence Tool. Enter any US property address to get:

- Investment valuation (estimated value, cap rate, rent estimates, comparables)
- Risk assessment (market, environmental, regulatory, financial, infrastructure)
- Zoning & building code analysis (classification, permitted uses, FAR, setbacks)
- AI-synthesized investment grade and executive summary

All analysis is based on **real data** from web searches, public records, and government APIs.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys (see below)

# 3. Build frontend and start server
npm start
```

The app will be available at `http://localhost:5173`

## API Keys (Free)

You need two API keys, both available for free:

### 1. Web Search API (required)

**Brave Search API** (recommended) - 2,000 free queries/month:
1. Go to https://brave.com/search/api/
2. Sign up for the free plan
3. Copy your API key to `BRAVE_API_KEY` in `.env`

Or **SerpAPI** - 100 free searches/month:
1. Go to https://serpapi.com/
2. Sign up for the free plan
3. Copy your API key to `SERP_API_KEY` in `.env`

### 2. AI Model API (required)

**OpenRouter** - free tier models available:
1. Go to https://openrouter.ai/
2. Sign up and get an API key
3. Copy to `AI_GATEWAY_API_KEY` in `.env`

You can optionally set `AI_MODEL` to choose a model (default: `x-ai/grok-3`).
You can also set `AI_BASE_URL` for any OpenAI-compatible endpoint.

## Architecture

```
re-dev-analyzer/
  server/
    index.js              Express server (API + static files)
    ai-synthesizer.js     AI synthesis of real data
    sources/
      geocode.js          Nominatim + US Census geocoding (free, no key)
      web-search.js       Multi-provider web search
      property-search.js  Property valuation & comps search
      zoning-search.js    Zoning & building code search
      risk-search.js      Environmental & market risk search
  src/                    React frontend (Vite + Tailwind)
  dist/                   Pre-built frontend (ready to serve)
```

## Data Sources

- **Geocoding**: OpenStreetMap Nominatim + US Census Geocoder (free, no API key)
- **Property Data**: Web search results from Zillow, PropertyShark, Trulia, public records
- **Zoning Data**: Web search results from city/county zoning databases
- **Risk Data**: Web search results from FEMA, environmental databases
- **AI Synthesis**: Combines all real data into structured investment analysis

## Development

```bash
# Start backend API server
npm run server

# In another terminal, start Vite dev server with hot reload
npm run dev
```

Dev mode uses Vite proxy to forward `/api` requests to the backend.

## License

MIT
