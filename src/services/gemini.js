// src/services/gemini.js

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
    import.meta.env.VITE_GEMINI_API_KEY
);

export const analyzeProfile = async (profileText) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const isUrl = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i.test(profileText.trim())

    let instruction = ''

    if (isUrl) {
        instruction = `
IMPORTANT: The user provided a LinkedIn URL instead of profile text.
You cannot access URLs. Tell the user you need the actual text content from their profile (About, headline, experience, etc.).`
    } else {
        instruction = `
Write a detailed roast of 120-180 words.

The roast should:
- Be funny
- Be sarcastic
- Mention specific issues found in the profile
- Include examples
- Feel like a stand-up comedian reviewing the profile

Minimum 2 paragraphs.`
    }

    const prompt = `
${instruction}

CRITICAL INSTRUCTION: Return ONLY raw JSON.
Do not wrap in markdown.
Do not use \`\`\`json.
Do not use code blocks.
Do not include any text before or after the JSON.
Do not add explanations, introductions, or conclusions.
Use emojis in the roast to make it more engaging.

Return exactly this structure:
{
  "score": number,
  "roast": "string",
  "headline": "string",
  "strengths": ["string"],
  "missingSkills": ["string"],
  "improvements": ["string"]
}

${isUrl ? 'USER INPUT:' : 'Profile:'}
${profileText}
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
};
