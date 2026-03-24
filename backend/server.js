require('dotenv').config();
const express = require('express');
const cors = require('cors');
const FirecrawlApp = require('@mendable/firecrawl-js').default;

const app = express();
app.use(cors());
app.use(express.json());

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// ─── Language Detection ─────────────────────────────────────────────────────
// Detects if text contains Greek characters or if language param is 'el'

function detectLanguage(text, langParam) {
  if (langParam === 'el' || langParam === 'greek') return 'el';
  if (langParam === 'en' || langParam === 'english') return 'en';
  // Auto-detect: if >30% of alphabetic chars are Greek, it's Greek
  if (text) {
    const alphaChars = text.replace(/[^a-zA-Zα-ωά-ώΑ-ΩΆ-Ώ]/g, '');
    const greekChars = text.replace(/[^α-ωά-ώΑ-ΩΆ-Ώ]/g, '');
    if (alphaChars.length > 0 && greekChars.length / alphaChars.length > 0.3) return 'el';
  }
  return 'en';
}

// ─── Severity Classification ────────────────────────────────────────────────

const EMERGENCY_KEYWORDS = [
  // English
  'immediately', 'emergency', 'toxic', 'poison', 'seizure', 'convuls',
  'cannot breathe', 'difficulty breathing', 'unconscious', 'collapse',
  'bloat', 'prolapse', 'heatstroke', 'internal bleeding', 'fatal',
  'xylitol', 'dark chocolate', 'antifreeze', 'rat poison', 'ibuprofen',
  'acetaminophen', 'grape', 'raisin', 'onion toxicity', 'garlic toxicity',
  'urinary blockage', 'gi stasis', 'lying on side unresponsive',
  'theobromine', 'lily toxicity', 'ethylene glycol',
  // Greek
  'δηλητηρίαση', 'δηλητήριο', 'τοξικό', 'σπασμοί', 'σπασμός', 'επιληπτικό',
  'δεν αναπνέει', 'δυσκολία αναπνοής', 'αναίσθητο', 'αναίσθητος', 'κατέρρευσε',
  'φούσκωμα στομάχου', 'θερμοπληξία', 'εσωτερική αιμορραγία', 'θανατηφόρο',
  'ξυλιτόλη', 'σοκολάτα', 'αντιψυκτικό', 'φυτοφάρμακο', 'ποντικοφάρμακο',
  'ιβουπροφαίνη', 'σταφύλι', 'σταφύλια', 'σταφίδα', 'σταφίδες',
  'κρεμμύδι', 'σκόρδο', 'ουρολογικό', 'απόφραξη ουροδόχου',
  'έφαγε σοκολάτα', 'έφαγε φάρμακο', 'ήπιε', 'κατάπιε',
  'λιμνάζει', 'δεν κινείται', 'δεν σηκώνεται'
];

const URGENT_KEYWORDS = [
  // English
  'today', 'soon as possible', 'within 24', 'urgent', 'should see',
  'vomiting multiple', 'vomiting repeatedly', 'not eating', 'bloody',
  'wound', 'fracture', 'limping severely', 'eye injury', 'infection',
  'swollen', 'blood in stool', 'blood in urine', 'lethargy',
  // Greek
  'σήμερα', 'επείγον', 'το συντομότερο', 'εντός 24',
  'κάνει εμετό', 'εμετός', 'εμετοί', 'δεν τρώει', 'αίμα',
  'πληγή', 'τραύμα', 'κάταγμα', 'κουτσαίνει', 'τραυματισμός ματιού',
  'μόλυνση', 'πρησμένο', 'πρησμένος', 'αίμα στα κόπρανα',
  'αίμα στα ούρα', 'λήθαργος', 'λήθαργο', 'αδράνεια',
  'διάρροια', 'πόνος', 'πονάει', 'ούρλιαζε', 'κλαίει'
];

// Greek translations for severity responses
const SEVERITY_TEXT = {
  el: {
    EMERGENCY: {
      action: 'Πηγαίνετε αμέσως σε κτηνίατρο έκτακτης ανάγκης',
      timeframe: 'τώρα'
    },
    URGENT: {
      action: 'Επισκεφθείτε κτηνίατρο σήμερα',
      timeframe: 'σήμερα'
    },
    MONITOR: {
      action: 'Παρακολουθήστε στο σπίτι, καλέστε κτηνίατρο αν χειροτερέψει',
      timeframe: 'παρακολούθηση'
    }
  },
  en: {
    EMERGENCY: {
      action: 'Go to an emergency vet immediately',
      timeframe: 'now'
    },
    URGENT: {
      action: 'See a vet today',
      timeframe: 'today'
    },
    MONITOR: {
      action: 'Monitor at home, call vet if worsens',
      timeframe: 'monitor'
    }
  }
};

// Greek fallback first-aid steps
const FALLBACK_FIRST_AID = {
  el: [
    'Κρατήστε το ζώο σας ήρεμο και άνετο',
    'Μην δίνετε κανένα φάρμακο χωρίς συμβουλή κτηνιάτρου',
    'Σημειώστε πότε ξεκίνησαν τα συμπτώματα και τι μπορεί να κατάπιε',
    'Επικοινωνήστε με τον κτηνίατρό σας ή με κτηνιατρείο έκτακτης ανάγκης'
  ],
  en: [
    'Keep your pet calm and comfortable',
    'Do not give any medication without vet advice',
    'Note the time symptoms started and any substances ingested',
    'Contact your vet or emergency animal hospital'
  ]
};

function classifySeverity(content, symptom) {
  const text = (content + ' ' + symptom).toLowerCase();

  if (EMERGENCY_KEYWORDS.some(kw => text.includes(kw))) {
    return { level: 'EMERGENCY', color: 'red' };
  }

  if (URGENT_KEYWORDS.some(kw => text.includes(kw))) {
    return { level: 'URGENT', color: 'amber' };
  }

  return { level: 'MONITOR', color: 'green' };
}

// ─── Language instruction injected into every tool response ──────────────────

function languageInstruction(lang) {
  if (lang === 'el') {
    return 'CRITICAL LANGUAGE RULE: The user is speaking Greek. You MUST respond ONLY in Greek. Do NOT use ANY English words — not even medical terms, severity levels, or filler words. Translate EVERYTHING to natural, fluent Greek. Say "κτηνίατρος" not "vet", "δηλητηρίαση" not "poisoning", "έκτακτη ανάγκη" not "emergency". Speak as a native Greek speaker would. No English at all.';
  }
  return '';
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

  return steps.length > 0 ? steps : null;
}

// ─── Source Extraction ──────────────────────────────────────────────────────

function extractSources(searchResults) {
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
  return sources;
}

// ─── Minimum Response Delay ─────────────────────────────────────────────────
const MIN_RESPONSE_MS = 2500;

function withMinDelay(startTime) {
  const elapsed = Date.now() - startTime;
  const remaining = MIN_RESPONSE_MS - elapsed;
  return remaining > 0 ? new Promise(r => setTimeout(r, remaining)) : Promise.resolve();
}

// ─── Poisoning Detection (bilingual) ────────────────────────────────────────

function isPoisoning(symptom) {
  return /\b(ate|eaten|ingested?|swallowed?|chewed?|licked?|drank|poison|toxic|έφαγε|κατάπιε|ήπιε|μασάει|γλείφει|δηλητήριο|τοξικό)\b/i.test(symptom);
}

// ─── POST /api/symptom-search ───────────────────────────────────────────────

app.post('/api/symptom-search', async (req, res) => {
  const startTime = Date.now();
  try {
    const { animal, symptom, details, animal_weight_kg, language } = req.body;

    if (!animal || !symptom) {
      return res.status(400).json({ error: 'animal and symptom are required' });
    }

    const lang = detectLanguage(symptom, language);
    const coreQuery = `${animal} ${symptom}`.trim();
    const poisoning = isPoisoning(symptom);

    console.log(`[symptom-search] Searching for: ${coreQuery} (poisoning: ${poisoning}, lang: ${lang})`);

    // Always search in English for best vet content quality
    // The LLM will translate the results to the user's language
    const q1 = poisoning
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
    const sevText = SEVERITY_TEXT[lang][severity.level];
    const firstAid = extractFirstAid(allContent, symptom) || FALLBACK_FIRST_AID[lang];
    const sources = extractSources(searchResults);

    // Build summary in the detected language
    let summary;
    if (lang === 'el') {
      summary = `Σύμφωνα με αξιόπιστες κτηνιατρικές πηγές, ${symptom} σε ${animal}`;
      if (animal_weight_kg) summary += ` βάρους ${animal_weight_kg} κιλών`;
      summary += ` κατατάσσεται ως ${severity.level === 'EMERGENCY' ? 'ΕΚΤΑΚΤΗ ΑΝΑΓΚΗ' : severity.level === 'URGENT' ? 'ΕΠΕΙΓΟΝ' : 'ΠΑΡΑΚΟΛΟΥΘΗΣΗ'}. ${sevText.action}.`;
    } else {
      summary = `Based on trusted veterinary sources, ${symptom} in a ${animal}`;
      if (animal_weight_kg) summary += ` weighing ${animal_weight_kg}kg`;
      summary += ` is classified as ${severity.level}. ${sevText.action}.`;
    }

    await withMinDelay(startTime);
    console.log(`[symptom-search] Total time: ${Date.now() - startTime}ms`);

    const response = {
      severity: severity.level,
      severity_color: severity.color,
      summary,
      first_aid: firstAid,
      go_to_vet: severity.level !== 'MONITOR',
      timeframe: sevText.timeframe,
      sources,
      raw_content: allContent.substring(0, 3000)
    };

    // Inject language instruction so the LLM knows to respond in the right language
    const langInstr = languageInstruction(lang);
    if (langInstr) {
      response.instruction = langInstr;
    }

    res.json(response);
  } catch (err) {
    console.error('Symptom search error:', err);
    const lang = detectLanguage(req.body?.symptom, req.body?.language);
    res.status(500).json({
      error: lang === 'el' ? 'Αποτυχία αναζήτησης κτηνιατρικών πηγών' : 'Failed to search veterinary sources',
      severity: 'URGENT',
      summary: lang === 'el'
        ? 'Δεν ήταν δυνατή η αναζήτηση. Για προληπτικούς λόγους, επικοινωνήστε με τον κτηνίατρό σας.'
        : 'Could not search vet sources. As a precaution, please contact your vet.',
      first_aid: FALLBACK_FIRST_AID[lang],
      go_to_vet: true,
      instruction: languageInstruction(lang)
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
  const addressRegex = /\d+\s+[A-Z][a-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Way|Place|Pl|Boulevard|Blvd|Close|Crescent|Terrace))/i;
  const match = text.match(addressRegex);
  return match ? match[0] : null;
}

app.post('/api/vet-finder', async (req, res) => {
  try {
    const { city, country, animal_type, language } = req.body;

    if (!city) {
      return res.status(400).json({ error: 'city is required' });
    }

    const lang = detectLanguage(city, language);

    // Search in both English and Greek for Greek cities
    const query = lang === 'el'
      ? `κτηνίατρος έκτακτης ανάγκης ${city} ${country || 'Ελλάδα'} 24ωρο κτηνιατρείο`
      : `emergency vet ${city} ${country || ''} open now 24 hours animal hospital`;

    const results = await firecrawl.search(query, { limit: 5 });

    if (!results?.data?.length) {
      const noResultMsg = lang === 'el'
        ? `Αναζήτηση κτηνιάτρων έκτακτης ανάγκης στην περιοχή ${city}`
        : `Search for emergency vets in ${city}`;
      return res.json({
        vets: [{
          name: noResultMsg,
          address: null,
          phone: null,
          open_24h: false,
          url: `https://www.google.com/search?q=emergency+vet+${encodeURIComponent(city)}+open+now`
        }],
        instruction: languageInstruction(lang)
      });
    }

    const vets = results.data.slice(0, 3).map(item => {
      const text = (item.description || '') + ' ' + (item.markdown || '');
      const phone = extractPhone(text);
      return {
        name: item.title || (lang === 'el' ? 'Κτηνίατρος Έκτακτης Ανάγκης' : 'Emergency Vet'),
        address: extractAddress(text),
        phone,
        open_24h: /24.?h|24.?hour|always open|open now|24.?ωρ|ανοιχτ/i.test(text),
        url: item.url
      };
    });

    // Build voice summary in the correct language
    const voiceSummary = vets.map((v, i) => {
      if (lang === 'el') {
        let s = `${i + 1}. ${v.name}`;
        if (v.phone) s += `, τηλέφωνο: ${v.phone}`;
        if (v.address) s += `, διεύθυνση: ${v.address}`;
        if (v.open_24h) s += ` (ανοιχτό 24 ώρες)`;
        return s;
      }
      let s = `${i + 1}. ${v.name}`;
      if (v.phone) s += `, phone number: ${v.phone}`;
      if (v.address) s += `, address: ${v.address}`;
      if (v.open_24h) s += ` (open 24 hours)`;
      return s;
    }).join('. ');

    const baseInstruction = lang === 'el'
      ? 'ΣΗΜΑΝΤΙΚΟ: Διάβασε το ΟΝΟΜΑ και τον ΑΡΙΘΜΟ ΤΗΛΕΦΩΝΟΥ δυνατά. ΜΗΝ διαβάζεις διευθύνσεις ιστοσελίδων. Αν δεν υπάρχει τηλέφωνο, πες το και πρότεινε αναζήτηση στο ίντερνετ.'
      : 'IMPORTANT: Read the vet NAME and PHONE NUMBER out loud. Do NOT read website URLs. If no phone number is available, say so and suggest the user search online for the number.';

    const langInstr = languageInstruction(lang);
    const instruction = langInstr ? `${langInstr}\n\n${baseInstruction}` : baseInstruction;

    res.json({
      vets,
      voice_summary: voiceSummary,
      instruction
    });
  } catch (err) {
    console.error('Vet finder error:', err);
    const lang = detectLanguage(req.body?.city, req.body?.language);
    res.status(500).json({
      error: lang === 'el' ? 'Αποτυχία αναζήτησης κτηνιάτρων' : 'Failed to search for vets',
      vets: [{
        name: lang === 'el'
          ? `Αναζήτηση κτηνιάτρων στην περιοχή ${req.body.city || ''}`
          : `Search for emergency vets in ${req.body.city || 'your area'}`,
        address: null,
        phone: null,
        open_24h: false,
        url: `https://www.google.com/search?q=emergency+vet+${encodeURIComponent(req.body.city || '')}+open+now`
      }],
      instruction: languageInstruction(lang)
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
