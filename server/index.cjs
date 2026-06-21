const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { PROMPT_TEXT_ANALYSIS, PROMPT_JSON_SCORE } = require('./prompts.cjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const analyzeCache = new Map();

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const genAI = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;
const groq = groqApiKey && !groqApiKey.includes('your_') && !groqApiKey.includes('placeholder')
  ? new Groq({ apiKey: groqApiKey })
  : null;

const PROVIDERS = [
  { provider: 'groq', model: 'llama-4-scout-17b-16e-instruct', enabled: !!groq },
  { provider: 'gemini', model: 'gemini-2.5-flash', enabled: !!genAI },
];

const DEFAULT_RESULT = {
  score: 0,
  roast: 'Could not generate roast. Please try again.',
  headline: 'No headline suggestion available',
  strengths: [],
  missingSkills: [],
  improvements: [],
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  return jsonMatch[0];
}

async function callAI(prompt, maxRetries = 1) {
  const pipeline = PROVIDERS.filter((p) => p.enabled);

  if (pipeline.length === 0) {
    throw new Error('No AI providers configured. Add GEMINI_API_KEY or GROQ_API_KEY to server/.env');
  }

  const errors = [];

  for (const item of pipeline) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let raw;
        if (item.provider === 'gemini') {
          const model = genAI.getGenerativeModel({ model: item.model });
          const result = await model.generateContent(prompt);
          raw = result.response.text();
        } else {
          const completion = await groq.chat.completions.create({
            model: item.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
          });
          raw = completion.choices[0]?.message?.content || '';
        }

        const jsonStr = extractJson(raw);
        return JSON.parse(jsonStr);
      } catch (err) {
        const status = err.status || err.response?.status || (err.raw?.error?.code ? 429 : 0);
        const msg = err.message || err.raw?.error?.message || '';

        if (status === 401 || msg.includes('Invalid API Key') || msg.includes('invalid_api_key')) {
          errors.push(`${item.provider}: invalid API key - disabling`);
          item.enabled = false;
          break;
        }

        if (status === 429 && attempt < maxRetries) {
          const delay = parseInt(err.raw?.error?.error_details?.[2]?.retryDelay || '15');
          console.warn(`${item.provider} rate limited, retrying in ${delay}s...`);
          await sleep(delay * 1000);
        } else {
          errors.push(`${item.provider}: ${msg.slice(0, 100)}`);
          break;
        }
      }
    }
  }

  console.error('All AI providers failed:', errors);
  throw new Error('AI quota exceeded on all providers. Add a new API key or try again later.');
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { profileText, name } = req.body;

    if (!profileText?.trim()) {
      return res.status(400).json({ error: 'Please paste your LinkedIn profile text' });
    }

    const cacheKey = `text:${profileText.slice(0, 50)}`;
    if (analyzeCache.has(cacheKey)) {
      return res.json({ ...analyzeCache.get(cacheKey), cached: true });
    }

    let parsed;
    try {
      parsed = JSON.parse(profileText);
    } catch {
      parsed = await callAI(PROMPT_TEXT_ANALYSIS(profileText, name));
    }

    analyzeCache.set(cacheKey, parsed);
    return res.json({
      ...DEFAULT_RESULT,
      ...parsed,
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : DEFAULT_RESULT.score,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : DEFAULT_RESULT.strengths,
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : DEFAULT_RESULT.missingSkills,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : DEFAULT_RESULT.improvements,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    if (err.message.includes('quota') || err.message.includes('429')) {
      res.status(500).json({ error: 'AI quota exceeded. Please try again in a moment, or add a new API key.' });
    } else {
      res.status(500).json({ error: 'Failed to analyze profile. Please try again.' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));