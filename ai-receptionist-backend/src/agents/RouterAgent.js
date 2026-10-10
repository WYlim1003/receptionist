import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
});
const MODEL = process.env.OPENAI_MODEL || 'gemini-2.5-flash';

export class RouterAgent {
  /**
   * Routes the conversation to the appropriate downstream agent.
   * @param {string} userText - The translated English text from the user.
   * @returns {Promise<string>} - Returns 'BOOKING', 'FAQ', or 'TRANSFER'.
   */
  async route(userText) {
    const prompt = `You are the Router Agent for an AI Receptionist. 
Based on the user's message, classify the intent into exactly one of the following categories:
- BOOKING: User wants to book, check availability, or cancel/reschedule an appointment.
- FAQ: User is asking about business hours, address, services, or general questions.
- TRANSFER: User explicitly asks to speak to a human or the owner, or is complaining.

Respond with ONLY the category name.

Message: "${userText}"`;

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });
      const category = response.choices[0].message.content.trim().toUpperCase();
      
      if (['BOOKING', 'FAQ', 'TRANSFER'].includes(category)) {
        return category;
      }
      return 'FAQ'; // Default fallback
    } catch (err) {
      console.error('[RouterAgent] Error routing:', err);
      return 'FAQ'; // Fallback
    }
  }
}
