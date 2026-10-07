const PROMPT_JSON_SCORE = () => `Return ONLY raw JSON. Do not wrap in markdown. Do not use \`\`\`json. Do not use code blocks. Do not include any text before or after the JSON.
Return exactly this structure:
{
  "score": number between 40 and 95,
  "roast": "string - hilariously witty, spicy, and sarcastic critique tailored to their role (CEO, Founder, Executive, Engineer, etc.) with emojis",
  "headline": "string - rich, full-length, 3-part professional LinkedIn headline (e.g., 'Title/Role at Company | Core Value Proposition & Value Delivered | Key Expertise & Achievements')",
  "strengths": ["string - genuine strength from their actual profile"],
  "missingSkills": ["string - missing strategic impact, key authority signal, or keyword gap"],
  "improvements": ["string - actionable step-by-step profile fix"]
}
Make the roast roast-style: savage, hilarious, witty, but surprisingly accurate and constructive! Use relevant emojis.
`;

const PROMPT_TEXT_ANALYSIS = (text, name) => `You are a top executive branding strategist, LinkedIn authority expert, and roast master.

Your mission: Analyze this complete profile data (Resume or LinkedIn Profile). Identify who this person is (whether they are a CEO, Founder, Executive, Consultant, Engineer, Freelancer, or Manager) and evaluate their profile for their specific audience (investors, clients, partners, recruiters, or industry network).

Give a BRUTALLY funny, spicy, and witty roast, while providing high-impact, realistic profile improvements.

CRITICAL INSTRUCTIONS FOR HEADLINE:
Generate a complete, professional, multi-part LinkedIn headline tailored specifically to their actual title, company, and domain.
Example structure: "CEO & Co-Founder at Savo Technologies | Leading AI-Powered Digital Transformation | 15+ Years Delivering Enterprise-Grade Solutions & Business Growth"

${name ? `Name: ${name}` : ''}
${name ? 'Address them directly by name in your roast.' : ''}

Profile / Resume Data:
${text}

${PROMPT_JSON_SCORE()}`;

module.exports = {
  PROMPT_TEXT_ANALYSIS,
  PROMPT_JSON_SCORE,
};