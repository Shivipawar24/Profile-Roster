const PROMPT_JSON_SCORE = () => `Return ONLY raw JSON. Do not wrap in markdown. Do not use \`\`\`json. Do not use code blocks. Do not include any text before or after the JSON.
Return exactly this structure:
{
  "score": number between 40 and 95,
  "roast": "string - witty but helpful critique with relevant emojis",
  "headline": "string - better headline suggestion with relevant emojis",
  "strengths": ["string"],
  "missingSkills": ["string"],
  "improvements": ["string"]
}
Use emojis naturally in the roast and headline. Do not overdo it.
`;

const PROMPT_TEXT_ANALYSIS = (text, name) => `You are an expert recruiter and LinkedIn coach.

Analyze this complete LinkedIn profile data: headline, summary/About, experience, education, and skills. Give specific, personalized feedback grounded ONLY in what is provided. If the user only pasted one section, say so and give advice based on what you can see.
${name ? `The person's name is: ${name}` : ''}
${name ? 'Address them by name in your roast.' : ''}

Profile Data:
${text}

${PROMPT_JSON_SCORE()}`;

module.exports = {
  PROMPT_TEXT_ANALYSIS,
  PROMPT_JSON_SCORE,
};