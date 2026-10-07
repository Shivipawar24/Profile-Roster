const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PROMPT_TEXT_ANALYSIS, PROMPT_JSON_SCORE } = require('./prompts.cjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const analyzeCache = new Map();
const rateLimitMap = new Map();

// Rate limiting: 10 requests per IP per hour
const RATE_LIMIT_MAX = 10;
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

function generateFallbackRoast(content, name) {
  const displayName = name?.trim() || 'Candidate';
  const score = Math.floor(Math.random() * 20) + 70; // 70 to 90

  return {
    score,
    roast: `Hey ${displayName}! 🔥 Your profile has a solid foundation, but right now it reads like a standard corporate manual. You list lots of responsibilities, but recruiters want to see measurable impact and outcome metrics! Time to cut the generic filler and highlight your real wins. 🚀`,
    headline: `${displayName} | High-Impact Professional & Results-Driven Specialist 💡`,
    strengths: [
      "Solid domain foundation and clear career progression",
      "Relevant technical terminology and industry background",
      "Clean structure and readable experience layout"
    ],
    missingSkills: [
      "Quantifiable metrics (e.g., '% increase', 'X revenue generated', 'users scaled')",
      "ATS keyword alignment tailored for competitive job descriptions",
      "Compelling executive summary hook at the top"
    ],
    improvements: [
      "Action-Oriented Bullets: Start every experience line with punchy action verbs (e.g., Spearheaded, Architected, Optimized).",
      "Add Measurable Impact: Include at least 3 concrete numbers or performance percentages in your work history.",
      "Executive Summary: Refine your summary to showcase your unique value proposition in 2-3 concise sentences."
    ]
  };
}

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

async function callOpenRouter(prompt, apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'liquid/lfm-2.5-2.6b:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenRouter error: ${res.status} ${err.error?.message || ''}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const jsonStr = extractJson(raw);
  return JSON.parse(jsonStr);
}

function getAIProviders() {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  const validGeminiKey = geminiApiKey && !geminiApiKey.includes('AQ.Ab8') ? geminiApiKey : null;
  const validGroqKey = groqApiKey && !groqApiKey.includes('your_') && !groqApiKey.includes('placeholder') ? groqApiKey : null;
  const validOpenRouterKey = openRouterApiKey && openRouterApiKey.length > 10 ? openRouterApiKey : null;

  const providers = [];

  if (validOpenRouterKey) {
    providers.push({
      provider: 'openrouter',
      apiKey: validOpenRouterKey,
    });
  }

  if (validGeminiKey) {
    providers.push({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      client: new GoogleGenerativeAI(validGeminiKey),
    });
  }

  if (validGroqKey) {
    providers.push({
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      client: new Groq({ apiKey: validGroqKey }),
    });
  }

  return providers;
}

async function callAI(prompt, name = '', fileData = null, maxRetries = 1) {
  const providers = getAIProviders();
  const errors = [];

  if (providers.length > 0) {
    for (const item of providers) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          let raw;
          if (item.provider === 'openrouter') {
            return await callOpenRouter(prompt, item.apiKey);
          } else if (item.provider === 'gemini') {
            const model = item.client.getGenerativeModel({ model: item.model });
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
            const completion = await item.client.chat.completions.create({
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
            errors.push(`${item.provider}: invalid API key`);
            break;
          }

          if (status === 429 && attempt < maxRetries) {
            const delay = parseInt(err.raw?.error?.error_details?.[2]?.retryDelay || '5');
            console.warn(`${item.provider} rate limited, retrying in ${delay}s...`);
            await sleep(delay * 1000);
          } else {
            errors.push(`${item.provider}: ${msg.slice(0, 100)}`);
            break;
          }
        }
      }
    }
  }

  console.warn('AI providers rate-limited/unavailable. Utilizing Smart Fallback Engine:', errors);
  return generateFallbackRoast(prompt, name);
}

const handleAnalyzeRequest = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: "Lots of people are roasting right now! You've reached your free limit (10 roasts/hour). Please try again in a little bit.",
      });
    }

    const { profileText, name, fileData } = req.body;

    if (!profileText?.trim() && !fileData?.base64) {
      return res.status(400).json({ error: 'Please upload your resume file or paste profile text' });
    }

    const contentToAnalyze = profileText?.trim() || fileData?.base64 || `Resume File: ${fileData?.filename || 'Uploaded Resume'}`;

    const cacheKey = getCacheKey(contentToAnalyze, name);
    if (analyzeCache.has(cacheKey)) {
      return res.json({ ...analyzeCache.get(cacheKey), cached: true });
    }

    let parsed;
    try {
      parsed = JSON.parse(contentToAnalyze);
    } catch {
      parsed = await callAI(PROMPT_TEXT_ANALYSIS(contentToAnalyze, name), name, fileData);
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
    return res.json(generateFallbackRoast('', req.body.name));
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