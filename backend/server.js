require('dotenv').config();
const express = require('express');
const cors = require('cors');
const FirecrawlApp = require('@mendable/firecrawl-js').default;

const app = express();
app.use(cors());
app.use(express.json());

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// ─── Severity Classification ────────────────────────────────────────────────

const EMERGENCY_KEYWORDS = [
  'immediately', 'emergency', 'toxic', 'poison', 'seizure', 'convuls',
  'cannot breathe', 'difficulty breathing', 'unconscious', 'collapse',
  'bloat', 'prolapse', 'heatstroke', 'internal bleeding', 'fatal',
  'xylitol', 'dark chocolate', 'antifreeze', 'rat poison', 'ibuprofen',
  'acetaminophen', 'grape', 'raisin', 'onion toxicity', 'garlic toxicity',
  'urinary blockage', 'gi stasis', 'lying on side unresponsive',
  'theobromine', 'lily toxicity', 'ethylene glycol'
];

const URGENT_KEYWORDS = [
  'today', 'soon as possible', 'within 24', 'urgent', 'should see',
  'vomiting multiple', 'vomiting repeatedly', 'not eating', 'bloody',
  'wound', 'fracture', 'limping severely', 'eye injury', 'infection',
  'swollen', 'blood in stool', 'blood in urine', 'lethargy'
];

function classifySeverity(content, symptom) {
  const text = (content + ' ' + symptom).toLowerCase();

  if (EMERGENCY_KEYWORDS.some(kw => text.includes(kw))) {
    return {
      level: 'EMERGENCY',
      color: 'red',
      action: 'Go to an emergency vet immediately',
      timeframe: 'now'
    };
  }

  if (URGENT_KEYWORDS.some(kw => text.includes(kw))) {
    return {
      level: 'URGENT',
      color: 'amber',
      action: 'See a vet today',
      timeframe: 'today'
    };
  }

  return {
    level: 'MONITOR',
    color: 'green',
    action: 'Monitor at home, call vet if worsens',
    timeframe: 'monitor'
  };
}

// ─── First Aid Extraction ───────────────────────────────────────────────────

function extractFirstAid(content, symptom) {
  // Extract actionable sentences from markdown content
  // Strip markdown to plain text first
  const plain = content
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links → text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // remove images
    .replace(/#{1,6}\s*/g, '')                   // remove heading markers
    .replace(/\*\*/g, '')                        // remove bold
    .replace(/\*/g, '')                          // remove italic
    .replace(/_/g, ' ')                          // underscores to spaces

  // Split into sentences
  const sentences = plain
    .split(/[.!]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  const steps = [];
  const junkPatterns = /pledge|brigade|donate|subscribe|newsletter|sign up|follow us|share|cookie|privacy|copyright|skip to|join|twitter|facebook|instagram/i;
  const actionPattern = /\b(do not|don't|keep|call|should|must|need to|important to|take|give|monitor|check|avoid|stop|never|contact|seek|go to|note|induce|watch|get to|bring|collect|save|observe|remove|wash|wrap|immediately|make sure|ensure|provide)/i;

  for (const sentence of sentences) {
    if (junkPatterns.test(sentence)) continue;
    if (!actionPattern.test(sentence)) continue;

    let clean = sentence.replace(/^[-•*\d.)\s]+/, '').trim();
    if (clean.length < 20) continue;

    // Truncate at a natural point if too long
    if (clean.length > 150) {
      const cutoff = clean.lastIndexOf(',', 150);
      if (cutoff > 60) clean = clean.substring(0, cutoff);
    }

    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!steps.some(s => s.toLowerCase().includes(clean.substring(0, 30).toLowerCase()))) {
      steps.push(clean);
    }
    if (steps.length >= 4) break;
  }

  if (steps.length === 0) {
    return [
      'Keep your pet calm and comfortable',
      'Do not give any medication without vet advice',
      'Note the time symptoms started and any substances ingested',
      'Contact your vet or emergency animal hospital'
    ];
  }

  return steps;
}

// ─── Source Extraction ──────────────────────────────────────────────────────

function extractSources(results) {
  const sources = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.data) {
      for (const item of r.value.data) {
        if (item.url) {
          try {
            const host = new URL(item.url).hostname.replace('www.', '');
            if (!sources.includes(host)) sources.push(host);
          } catch {}
        }
      }
    }
  }
  return sources;
}

// ─── Minimum Response Delay ─────────────────────────────────────────────────
// Ensures the agent has time to have a conversation before results arrive.
// The agent asks a personal question while the search runs — this delay
// guarantees the user has time to answer before results interrupt.
const MIN_RESPONSE_MS = 8000;

function withMinDelay(startTime) {
  const elapsed = Date.now() - startTime;
  const remaining = MIN_RESPONSE_MS - elapsed;
  return remaining > 0 ? new Promise(r => setTimeout(r, remaining)) : Promise.resolve();
}

// ─── POST /api/symptom-search ───────────────────────────────────────────────

app.post('/api/symptom-search', async (req, res) => {
  const startTime = Date.now();
  try {
    const { animal, symptom, details, animal_weight_kg } = req.body;

    if (!animal || !symptom) {
      return res.status(400).json({ error: 'animal and symptom are required' });
    }

    // Keep query short — Firecrawl works better with concise queries
    const coreQuery = `${animal} ${symptom}`.trim();
    const isPoisoning = /\b(ate|eaten|ingested?|swallowed?|chewed?|licked?|drank|poison|toxic)\b/i.test(symptom);

    console.log(`[symptom-search] Searching for: ${coreQuery} (poisoning: ${isPoisoning})`);

    // Tailor search queries — run 2 in parallel for speed (must stay under 8s)
    const q1 = isPoisoning
      ? `${coreQuery} toxic poison emergency treatment site:aspca.org OR site:petmd.com`
      : `${coreQuery} symptoms treatment when to call vet site:petmd.com`;
    const q2 = `${coreQuery} first aid advice site:bluecross.org.uk OR site:petmd.com`;

    const searchResults = await Promise.allSettled([
      firecrawl.search(q1, { limit: 3, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } }),
      firecrawl.search(q2, { limit: 2, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } })
    ]).then(results => {
      return results.map((r, i) => {
        if (r.status === 'fulfilled') {
          console.log(`[symptom-search] Query ${i + 1}: ${r.value?.data?.length || 0} results`);
          return r.value;
        }
        console.log(`[symptom-search] Query ${i + 1} FAILED:`, r.reason?.message);
        return { data: [] };
      });
    });

    const allContent = searchResults
      .flatMap(r => r?.data || [])
      .map(item => item.markdown || item.content || '')
      .filter(Boolean)
      .join('\n\n---\n\n')
      .substring(0, 8000);

    console.log(`[symptom-search] Total content length: ${allContent.length}`);

    const severity = classifySeverity(allContent, symptom);
    const firstAid = extractFirstAid(allContent, symptom);
    // Extract source domains from results
    const sources = [];
    for (const r of searchResults) {
      for (const item of (r?.data || [])) {
        if (item.url) {
          try {
            const host = new URL(item.url).hostname.replace('www.', '');
            if (!sources.includes(host)) sources.push(host);
          } catch {}
        }
      }
    }

    let summary = `Based on trusted veterinary sources, ${symptom} in a ${animal}`;
    if (animal_weight_kg) summary += ` weighing ${animal_weight_kg}kg`;
    summary += ` is classified as ${severity.level}. ${severity.action}.`;

    // Wait minimum time so the agent can have a conversation before results arrive
    await withMinDelay(startTime);
    console.log(`[symptom-search] Total time: ${Date.now() - startTime}ms`);

    res.json({
      severity: severity.level,
      severity_color: severity.color,
      summary,
      first_aid: firstAid,
      go_to_vet: severity.level !== 'MONITOR',
      timeframe: severity.timeframe,
      sources,
      raw_content: allContent.substring(0, 3000)
    });
  } catch (err) {
    console.error('Symptom search error:', err);
    res.status(500).json({
      error: 'Failed to search veterinary sources',
      severity: 'URGENT',
      summary: 'Could not search vet sources. As a precaution, please contact your vet.',
      first_aid: [
        'Keep your pet calm and comfortable',
        'Do not give any medication without vet advice',
        'Contact your vet or emergency animal hospital'
      ],
      go_to_vet: true
    });
  }
});

// ─── POST /api/vet-finder ───────────────────────────────────────────────────

function extractPhone(text) {
  const phoneRegex = /[\+\(]?[0-9][0-9\s\-\(\)]{7,}[0-9]/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0].trim() : null;
}

function extractAddress(text) {
  const addressRegex = /\d+\s+[A-Z][a-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Way|Place|Pl|Boulevard|Blvd|Close|Crescent|Terrace))/i;
  const match = text.match(addressRegex);
  return match ? match[0] : null;
}

app.post('/api/vet-finder', async (req, res) => {
  try {
    const { city, country, animal_type } = req.body;

    if (!city) {
      return res.status(400).json({ error: 'city is required' });
    }

    const query = `emergency vet ${city} ${country || ''} open now 24 hours animal hospital`;

    const results = await firecrawl.search(query, {
      limit: 5
    });

    if (!results?.data?.length) {
      return res.json({
        vets: [{
          name: `Search for emergency vets in ${city}`,
          address: null,
          phone: null,
          open_24h: false,
          url: `https://www.google.com/search?q=emergency+vet+${encodeURIComponent(city)}+open+now`
        }]
      });
    }

    const vets = results.data.slice(0, 3).map(item => {
      const text = item.description || item.markdown || '';
      return {
        name: item.title || 'Emergency Vet',
        address: extractAddress(text),
        phone: extractPhone(text),
        open_24h: /24.?h|24.?hour|always open|open now/i.test(text),
        url: item.url
      };
    });

    res.json({ vets });
  } catch (err) {
    console.error('Vet finder error:', err);
    res.status(500).json({
      error: 'Failed to search for vets',
      vets: [{
        name: `Search for emergency vets in ${req.body.city || 'your area'}`,
        address: null,
        phone: null,
        open_24h: false,
        url: `https://www.google.com/search?q=emergency+vet+${encodeURIComponent(req.body.city || '')}+open+now`
      }]
    });
  }
});

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Start ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PawSOS backend running on port ${PORT}`);
});
