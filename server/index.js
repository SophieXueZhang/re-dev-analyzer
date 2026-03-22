import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { geocodeAddress } from './sources/geocode.js';
import { searchPropertyData } from './sources/property-search.js';
import { searchZoningData } from './sources/zoning-search.js';
import { searchRiskData } from './sources/risk-search.js';
import { synthesizeAnalysis } from './ai-synthesizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3100;

// Serve static build
app.use(express.static(join(__dirname, '..', 'dist')));

app.post('/api/analyze', async (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  console.log(`\n=== Analyzing: ${address} ===`);

  try {
    // Step 1: Geocode address (Nominatim + Census)
    console.log('[1/4] Geocoding address...');
    const geoData = await geocodeAddress(address);
    console.log(`  -> ${geoData.displayName || 'geocoded'}`);

    // Step 2-4: Run searches in parallel for speed
    console.log('[2/4] Searching property data...');
    console.log('[3/4] Searching zoning data...');
    console.log('[4/4] Searching risk data...');

    const [propertyData, zoningData, riskData] = await Promise.all([
      searchPropertyData(address, geoData),
      searchZoningData(address, geoData),
      searchRiskData(address, geoData),
    ]);

    console.log('  -> All searches complete');

    // Step 5: AI synthesis with real data
    console.log('[5/5] AI synthesis with real data...');
    const analysis = await synthesizeAnalysis(address, geoData, propertyData, zoningData, riskData);

    console.log('=== Analysis complete ===\n');
    res.json(analysis);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback - serve index.html for any non-API routes
app.use((req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RE Dev Analyzer running on port ${PORT}`);
  console.log(`  -> Frontend: http://localhost:${PORT}`);
  console.log(`  -> API:      http://localhost:${PORT}/api/analyze`);
});
