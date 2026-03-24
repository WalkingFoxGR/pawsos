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
  const plain = content
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, ' ')

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

// ─── Minimum Response Delay ─────────────────────────────────────────────────
const MIN_RESPONSE_MS = 2500;

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

    const coreQuery = `${animal} ${symptom}`.trim();
    const isPoisoning = /\b(ate|eaten|ingested?|swallowed?|chewed?|licked?|drank|poison|toxic)\b/i.test(symptom);

    console.log(`[symptom-search] Searching for: ${coreQuery} (poisoning: ${isPoisoning})`);

    const q1 = isPoisoning
      ? `${coreQuery} toxic poison emergency treatment site:aspca.org OR site:petmd.com`
      : `${coreQuery} symptoms treatment when to call vet site:petmd.com`;
    const q2 = `${coreQuery} first aid advice site:bluecross.org.uk OR site:petmd.com`;

    // Step 1: Search for relevant pages
    const searchResults = await Promise.allSettled([
      firecrawl.search(q1, { limit: 3 }),
      firecrawl.search(q2, { limit: 2 })
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

    // Step 2: Scrape the top 2 URLs for full article content
    const allUrls = searchResults
      .flatMap(r => r?.data || [])
      .filter(item => item.url)
      .map(item => item.url);
    const uniqueUrls = [...new Set(allUrls)].slice(0, 2);

    console.log(`[symptom-search] Scraping ${uniqueUrls.length} URLs:`, uniqueUrls);

    const scrapeResults = await Promise.allSettled(
      uniqueUrls.map(url =>
        firecrawl.scrapeUrl(url, { formats: ['markdown'], onlyMainContent: true, timeout: 6000 })
      )
    );

    const scrapedContent = scrapeResults
      .filter(r => r.status === 'fulfilled' && r.value?.markdown)
      .map(r => r.value.markdown)
      .join('\n\n---\n\n');

    // Combine search snippets + scraped full content
    const searchSnippets = searchResults
      .flatMap(r => r?.data || [])
      .map(item => item.markdown || item.description || '')
      .filter(Boolean)
      .join('\n\n');

    const allContent = (scrapedContent || searchSnippets).substring(0, 12000);
    console.log(`[symptom-search] Content: ${scrapedContent.length} scraped + ${searchSnippets.length} snippets`);

    console.log(`[symptom-search] Total content length: ${allContent.length}`);

    const severity = classifySeverity(allContent, symptom);
    const firstAid = extractFirstAid(allContent, symptom);
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
  const patterns = [
    /\+\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{0,4}/g,
    /\(\d{2,5}\)\s?\d{3,8}/g,
    /\d{3,5}[\s\-]\d{3,4}[\s\-]\d{3,4}/g,
    /[\+\(]?[0-9][0-9\s\-\(\)]{7,}[0-9]/g
  ];
  for (const regex of patterns) {
    const matches = text.match(regex);
    if (matches) return matches[0].trim();
  }
  return null;
}

function extractAddress(text) {
  const patterns = [
    // English addresses
    /\d+\s+[A-Z][a-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Way|Place|Pl|Boulevard|Blvd|Close|Crescent|Terrace))/i,
    // Greek addresses (Οδός Name Number or Name Number, City)
    /[Α-Ωα-ω]+(?:\s+[Α-Ωα-ω]+)*\s+\d{1,4}(?:\s*,\s*[Α-Ωα-ω\s]+)?/,
    // Generic: street name + number + postal code
    /[A-Za-zΑ-Ωα-ω\s]{5,30}\s+\d{1,4}(?:\s*,\s*\d{3,5})?/
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) return match[0].trim();
  }
  return null;
}

app.post('/api/vet-finder', async (req, res) => {
  try {
    const { city, country, animal_type } = req.body;
    console.log('Vet finder request:', JSON.stringify(req.body));

    if (!city) {
      return res.status(400).json({ error: 'city is required' });
    }

    const location = country || 'Greece';
    const query = `emergency veterinary clinic ${city} ${location} open now 24 hour animal hospital phone number`;

    // Step 1: Search for vet listings
    const results = await firecrawl.search(query, { limit: 5 });

    if (!results?.data?.length) {
      return res.json({
        vets: [{
          name: `Search for emergency vets in ${city}`,
          address: null,
          phone: null,
          open_24h: false,
          url: `https://www.google.com/search?q=emergency+vet+${encodeURIComponent(city)}+${encodeURIComponent(location)}+open+now`
        }]
      });
    }

    // Step 2: Scrape top result for richer data (phone, address)
    const topUrls = results.data
      .filter(item => item.url && !item.url.includes('facebook.com'))
      .slice(0, 2)
      .map(item => item.url);

    console.log(`[vet-finder] Scraping ${topUrls.length} URLs:`, topUrls);

    const scrapeResults = await Promise.allSettled(
      topUrls.map(url =>
        firecrawl.scrapeUrl(url, { formats: ['markdown'], onlyMainContent: true, timeout: 6000 })
      )
    );

    // Build scraped content map by URL
    const scrapedMap = {};
    topUrls.forEach((url, i) => {
      if (scrapeResults[i]?.status === 'fulfilled' && scrapeResults[i].value?.markdown) {
        scrapedMap[url] = scrapeResults[i].value.markdown;
      }
    });

    const vets = results.data.slice(0, 3).map(item => {
      const scraped = scrapedMap[item.url] || '';
      const text = (item.description || '') + ' ' + (item.markdown || '') + ' ' + scraped;
      const phone = extractPhone(text);
      return {
        name: item.title || 'Emergency Vet',
        address: extractAddress(text),
        phone,
        open_24h: /24.?h|24.?hour|always open|open now/i.test(text),
        url: item.url
      };
    });

    const voiceSummary = vets.map((v, i) => {
      let s = `${i + 1}. ${v.name}`;
      if (v.phone) s += `, phone number: ${v.phone}`;
      if (v.address) s += `, address: ${v.address}`;
      if (v.open_24h) s += ` (open 24 hours)`;
      return s;
    }).join('. ');

    res.json({
      vets,
      voice_summary: voiceSummary,
      instruction: 'IMPORTANT: Read the vet NAME and PHONE NUMBER out loud. Do NOT read website URLs. If no phone number is available, say so and suggest the user search online for the number.'
    });
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

// ─── Serve embed.js ─────────────────────────────────────────────────────────

const path = require('path');
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
}));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Start ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PawSOS backend running on port ${PORT}`);
});
