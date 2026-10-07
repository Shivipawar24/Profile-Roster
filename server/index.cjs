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
    .update(`v4:${content}:${name || ''}`)
    .digest('hex');
}

function extractHeadlineAndPersona(text, name) {
  const displayName = name?.trim() || 'Professional';
  const rawText = (text || '').trim();
  const contentLower = rawText.toLowerCase();

  const firstLine = rawText.split('\n')[0]?.trim() || '';

  // Extract explicit title / company patterns if present (e.g., "CEO & Co-Founder at Savo Technologies")
  const ceoMatch = rawText.match(/(CEO|Chief Executive Officer|Founder|Co-Founder|Managing Director|Vice President|VP|Director|Head of [A-Za-z]+)\s*(?:&|and)?\s*(?:Co-Founder|Founder)?\s*(?:at|@|-)?\s*([A-Za-z0-9\s\.\,\-]+)/i);
  const engineerMatch = rawText.match(/(Software Engineer|Frontend Engineer|Full Stack Developer|Backend Developer|Architect|Data Scientist|Product Manager|Marketing Lead|UI\/UX Designer)\s*(?:at|@|-)?\s*([A-Za-z0-9\s\.\,\-]+)/i);

  let currentRole = '';

  if (ceoMatch) {
    currentRole = ceoMatch[0].trim().split('\n')[0].slice(0, 60);
  } else if (engineerMatch) {
    currentRole = engineerMatch[0].trim().split('\n')[0].slice(0, 60);
  } else if (firstLine.length > 5 && firstLine.length < 60 && !firstLine.toLowerCase().includes('http')) {
    currentRole = firstLine;
  } else if (contentLower.includes('ceo') || contentLower.includes('founder') || contentLower.includes('co-founder')) {
    currentRole = 'CEO & Co-Founder';
  } else if (contentLower.includes('director') || contentLower.includes('vp') || contentLower.includes('head of')) {
    currentRole = 'Executive Business Leader';
  } else if (contentLower.includes('react') || contentLower.includes('frontend') || contentLower.includes('javascript') || contentLower.includes('web')) {
    currentRole = 'Senior Frontend Engineer & React Specialist';
  } else if (contentLower.includes('full stack') || contentLower.includes('node') || contentLower.includes('express') || contentLower.includes('python')) {
    currentRole = 'Senior Full-Stack Software Engineer';
  } else if (contentLower.includes('data') || contentLower.includes('analytics') || contentLower.includes('sql')) {
    currentRole = 'Data Science & Analytics Strategist';
  } else if (contentLower.includes('design') || contentLower.includes('ui') || contentLower.includes('ux') || contentLower.includes('figma')) {
    currentRole = 'Product & UI/UX Design Leader';
  } else if (contentLower.includes('marketing') || contentLower.includes('growth') || contentLower.includes('seo')) {
    currentRole = 'Growth Marketing & Strategy Specialist';
  } else {
    const defaultRoles = [
      'Senior Technology Consultant & Solutions Architect',
      'Strategic Innovation Leader & Tech Specialist',
      'Enterprise Systems Engineer & Product Strategist',
      'Digital Transformation Lead & Solutions Architect'
    ];
    const nameHash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    currentRole = defaultRoles[nameHash % defaultRoles.length];
  }

  let pillar2 = 'Driving Strategic Digital Innovation & Product Excellence';

  if (contentLower.includes('ai') || contentLower.includes('machine learning') || contentLower.includes('llm') || contentLower.includes('transformation')) {
    pillar2 = 'Leading AI-Powered Digital Transformation & Next-Gen Innovation';
  } else if (contentLower.includes('saas') || contentLower.includes('cloud') || contentLower.includes('aws') || contentLower.includes('devops')) {
    pillar2 = 'Scaling Enterprise Cloud Infrastructure & High-Performance SaaS Architecture';
  } else if (contentLower.includes('react') || contentLower.includes('javascript') || contentLower.includes('next.js') || contentLower.includes('web')) {
    pillar2 = 'Building High-Performance Web Applications & Modern Interactive UIs';
  } else if (contentLower.includes('growth') || contentLower.includes('marketing') || contentLower.includes('revenue') || contentLower.includes('sales')) {
    pillar2 = 'Accelerating Customer Acquisition & Sustainable Business Growth';
  } else if (contentLower.includes('mobile') || contentLower.includes('flutter') || contentLower.includes('react native') || contentLower.includes('android')) {
    pillar2 = 'Architecting High-Scale Cross-Platform Mobile Applications';
  }

  let pillar3 = 'Delivering Enterprise-Grade Technology Solutions & Business Growth';

  if (contentLower.includes('year') || contentLower.includes('exp')) {
    const yrMatch = rawText.match(/(\d+\+?\s*years?)/i);
    if (yrMatch) {
      pillar3 = `${yrMatch[0]} Delivering High-Impact Enterprise Solutions`;
    }
  }

  const isExecutive = currentRole.toLowerCase().includes('ceo') || currentRole.toLowerCase().includes('founder') || currentRole.toLowerCase().includes('director') || currentRole.toLowerCase().includes('vp') || currentRole.toLowerCase().includes('executive');

  const headline = `${currentRole} | ${pillar2} | ${pillar3}`;

  return {
    displayName,
    currentRole,
    isExecutive,
    headline,
  };
}

function generateFallbackRoast(rawContent, name) {
  const { displayName, currentRole, isExecutive, headline } = extractHeadlineAndPersona(rawContent, name);
  const score = Math.floor(Math.random() * 20) + 68; // 68 to 88

  let roastText = '';
  if (isExecutive) {
    roastText = `Well hello, ${displayName}... 👑 As a ${currentRole}, your profile carries significant weight, but right now it reads like an official annual corporate report. You're flexing high-level buzzwords without giving your target audience (investors, clients, and strategic partners) raw proof of numbers, revenue impact, or scaling metrics. Claiming 'visionary leadership' without hard data is like an engine running without fuel. Let's turn your experience into a magnet for high-value deals and industry authority! 🚀`;
  } else {
    roastText = `Oh boy, ${displayName}... 💀 Your profile reads like a generic corporate manual. As a ${currentRole}, you've listed your daily responsibilities, but industry leaders and prospective clients want to see measurable outcomes and high-impact deliverables! Claiming you're 'hardworking and result-driven' without proof is like a restaurant advertising food as 'edible'. Let's replace the corporate filler with real quantifiable impact so your audience takes notice immediately! ⚡`;
  }

  const targetAudience = isExecutive ? "Investors, High-Value Clients & Key Partners" : "Hiring Leaders, Clients & Industry Network";

  return {
    score,
    roast: roastText,
    headline: headline,
    strengths: [
      `Strong professional positioning as ${currentRole}`,
      `Clear domain foundation and active industry experience`,
      `Structured experience timeline with visible core competencies`
    ],
    missingSkills: [
      "Quantifiable Outcomes (e.g., '% revenue growth', '$ cost savings', 'users/clients scaled')",
      `High-Authority Signals tailored for ${targetAudience}`,
      "Compelling Executive Summary Hook (the first 2 lines visible before 'See More')"
    ],
    improvements: [
      "Quantify Every Milestone: Add hard metrics to your current role (e.g., 'Scaled revenue by 35%' or 'Led team of 15 to launch enterprise platform').",
      "Cut Vague Corporate Jargon: Replace generic terms like 'hardworking leader' with tangible outcomes and specialized domain terms.",
      "High-Impact 3-Part Headline: Update your headline to the formula above to command instant respect from your network."
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
      model: 'openrouter/free',
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

async function callAI(prompt, rawContent = '', name = '', fileData = null, maxRetries = 1) {
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
  }

  console.warn('AI providers rate-limited/unavailable. Utilizing Smart Fallback Engine:', errors);
  return generateFallbackRoast(rawContent, name);
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
      parsed = await callAI(PROMPT_TEXT_ANALYSIS(contentToAnalyze, name), contentToAnalyze, name, fileData);
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
    return res.json(generateFallbackRoast(req.body.profileText, req.body.name));
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