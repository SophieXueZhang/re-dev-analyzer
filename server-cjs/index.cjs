const express = require('express');
const cors = require('cors');
const path = require('path');
const { geocodeAddress } = require('./sources/geocode.cjs');
const { fetchPropertyData } = require('./sources/property-data.cjs');
const { fetchZoningData } = require('./sources/zoning-data.cjs');
const { fetchRiskData } = require('./sources/risk-data.cjs');
const { fetchCensusData } = require('./sources/census-data.cjs');
const { synthesizeAnalysis } = require('./ai-synthesizer.cjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3100;

// Serve static build
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.post('/api/analyze', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address is required' });

  console.log(`\n=== Analyzing: ${address} ===`);
  const startTime = Date.now();

  try {
    // Step 1: Geocode address
    console.log('[1/5] Geocoding...');
    const geo = await geocodeAddress(address);
    console.log(`  -> ${geo.matchedAddress || geo.displayName} (${geo.lat}, ${geo.lon})`);

    // Step 2-5: Parallel data fetch from ALL sources
    console.log('[2-5] Fetching data from 10+ sources in parallel...');
    const [propertyData, zoningData, riskData, censusData] = await Promise.all([
      fetchPropertyData(address, geo).catch(e => { console.error('  Property error:', e.message); return {}; }),
      fetchZoningData(address, geo).catch(e => { console.error('  Zoning error:', e.message); return {}; }),
      fetchRiskData(address, geo).catch(e => { console.error('  Risk error:', e.message); return {}; }),
      fetchCensusData(geo).catch(e => { console.error('  Census error:', e.message); return {}; }),
    ]);

    console.log('[6/6] AI synthesis with real data...');
    const analysis = await synthesizeAnalysis(address, geo, propertyData, zoningData, riskData, censusData);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`=== Done in ${elapsed}s ===\n`);
    res.json(analysis);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RE Dev Analyzer running on port ${PORT}`);
  console.log(`  -> Frontend: http://localhost:${PORT}`);
  console.log(`  -> API:      http://localhost:${PORT}/api/analyze`);
});
