const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PROMPT_TEXT_ANALYSIS, PROMPT_JSON_SCORE } = require('./prompts.cjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const analyzeCache = new Map();
const rateLimitMap = new Map();

// Rate limiting: 5 requests per IP per hour
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const userHistory = rateLimitMap.get(ip) || [];
  const recentRequests = userHistory.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

function getCacheKey(content, name) {
  return crypto
    .createHash('sha256')
    .update(`${content}:${name || ''}`)
    .digest('hex');
}

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const genAI = geminiApiKey && !geminiApiKey.includes('AQ.Ab8')
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;
const groq = groqApiKey && !groqApiKey.includes('your_') && !groqApiKey.includes('placeholder')
  ? new Groq({ apiKey: groqApiKey })
  : null;

const PROVIDERS = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: !!groq },
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

async function callAI(prompt, fileData = null, maxRetries = 1) {
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
          if (fileData?.base64) {
            const result = await model.generateContent([
              {
                inlineData: {
                  data: fileData.base64,
                  mimeType: fileData.mimeType || 'application/pdf',
                },
              },
              prompt,
            ]);
            raw = result.response.text();
          } else {
            const result = await model.generateContent(prompt);
            raw = result.response.text();
          }
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

const handleAnalyzeRequest = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    // 1. Rate Limiting Check
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: "Lots of people are roasting right now! You've reached your limit (5 roasts per hour). Please try again in a little bit.",
      });
    }

    const { profileText, name, fileData } = req.body;

    if (!profileText?.trim() && !fileData?.base64) {
      return res.status(400).json({ error: 'Please upload your resume file or paste profile text' });
    }

    const contentToAnalyze = profileText?.trim() || fileData?.base64 || `Resume File: ${fileData?.filename || 'Uploaded Resume'}`;

    // 2. SHA-256 Caching Check
    const cacheKey = getCacheKey(contentToAnalyze, name);
    if (analyzeCache.has(cacheKey)) {
      return res.json({ ...analyzeCache.get(cacheKey), cached: true });
    }

    let parsed;
    try {
      parsed = JSON.parse(contentToAnalyze);
    } catch {
      parsed = await callAI(PROMPT_TEXT_ANALYSIS(contentToAnalyze, name), fileData);
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
    const msg = err.message || '';
    if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded') || msg.includes('failed')) {
      res.status(429).json({
        error: 'Lots of people are roasting right now! AI is at capacity — try again in a minute.',
      });
    } else {
      res.status(500).json({
        error: 'Lots of people roasting right now, try again in a minute.',
      });
    }
  }
};

app.post('/api/analyze', handleAnalyzeRequest);
app.post('/analyze', handleAnalyzeRequest);
app.post('/', handleAnalyzeRequest);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}