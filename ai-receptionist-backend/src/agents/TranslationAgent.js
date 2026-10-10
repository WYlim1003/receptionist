import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
});
const MODEL = process.env.OPENAI_MODEL || 'gemini-2.5-flash';

export class TranslationAgent {
  /**
   * Detects language and translates the incoming user message to English (the internal processing language).
   * @param {string} userText - The original transcribed text.
   * @returns {Promise<{ translatedText: string, detectedLanguage: string }>}
   */
  async translateToInternal(userText) {
    const prompt = `You are a translation agent for a Malaysian AI Receptionist. 
Analyze the following text. 
1. Identify the language/dialect (e.g., English, Malay, Mandarin, Cantonese, Hokkien, Manglish, Tamil).
2. Translate the meaning accurately to standard English for processing by downstream agents.
Provide the response as JSON: { "detectedLanguage": "...", "translatedText": "..." }

Text: "${userText}"`;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error('[TranslationAgent] Error translating to internal:', err);
      return { translatedText: userText, detectedLanguage: 'English' }; // Fallback
    }
  }

  /**
   * Translates the internal AI response back to the user's detected language.
   * @param {string} internalText - The English response from the internal agents.
   * @param {string} targetLanguage - The language detected from the user.
   * @returns {Promise<string>}
   */
  async translateToNative(internalText, targetLanguage) {
    if (!targetLanguage || targetLanguage.toLowerCase() === 'english') {
      return internalText;
    }

    const prompt = `Translate the following English response into natural conversational ${targetLanguage}. 
Keep it concise and suitable for spoken dialogue over a phone call. Maintain a warm and professional tone.

Text: "${internalText}"`;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error('[TranslationAgent] Error translating to native:', err);
      return internalText; // Fallback
    }
  }
}
