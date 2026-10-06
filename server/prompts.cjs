const PROMPT_JSON_SCORE = () => `Return ONLY raw JSON. Do not wrap in markdown. Do not use \`\`\`json. Do not use code blocks. Do not include any text before or after the JSON.
Return exactly this structure:
{
  "score": number between 40 and 95,
  "roast": "string - witty but helpful critique with relevant emojis",
  "headline": "string - better headline or resume summary suggestion with relevant emojis",
  "strengths": ["string"],
  "missingSkills": ["string"],
  "improvements": ["string"]
}
Use emojis naturally in the roast and headline. Do not overdo it.
`;

const PROMPT_TEXT_ANALYSIS = (text, name) => `You are a top-tier executive recruiter, ATS expert, and career strategist.

Analyze this complete Resume / LinkedIn profile data: headline/objective, summary, work experience, projects, skills, and education. Give specific, personalized feedback grounded ONLY in what is provided.
${name ? `The candidate's name is: ${name}` : ''}
${name ? 'Address them by name in your roast.' : ''}

Candidate Resume / Profile Data:
${text}

${PROMPT_JSON_SCORE()}`;

module.exports = {
  PROMPT_TEXT_ANALYSIS,
  PROMPT_JSON_SCORE,
};