/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 3: LLMAgent (Language Understanding)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Take the transcription text and use Google Gemini (via the backend) as the
 *   primary LLM to:
 *     1. Understand the customer's intent
 *     2. Generate a merchant-friendly explanation in English
 *     3. Detect the dialect/language used
 *
 *   Falls back to local Qwen (via the Python dialect server) if Gemini
 *   is unavailable.
 *
 * Input:  { transcription: string }
 * Output: { intent: string, explanation: string, language: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = 'http://127.0.0.1:3001';
const DIALECT_SERVER_URL = 'http://127.0.0.1:8001';

export async function runLLMAgent({ transcription, onLog }) {
  onLog(`🧠 LLMAgent: Analysing transcription with Gemini (primary)...`);
  onLog(`   Input: "${transcription}"`);

  try {
    // Primary: Gemini via backend proxy
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription }),
    });

    if (!response.ok) throw new Error(`Backend /understand returned ${response.status}`);

    const data = await response.json();

    onLog(`✅ LLMAgent (Gemini): Intent identified → "${data.intent}"`);
    onLog(`   Language detected: ${data.language}`);

    return {
      intent: data.intent,
      explanation: data.explanation,
      language: data.language,
      model: 'gemini',
    };
  } catch (err) {
    onLog(`⚠️  LLMAgent: Gemini unavailable (${err.message}). Falling back to local Qwen...`);
    return await _fallbackToLocalQwen({ transcription, onLog });
  }
}

async function _fallbackToLocalQwen({ transcription, onLog }) {
  const response = await fetch(`${DIALECT_SERVER_URL}/understand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcription }),
  });

  if (!response.ok) {
    throw new Error(`LLMAgent: Local Qwen fallback also failed — status ${response.status}`);
  }

  const data = await response.json();
  onLog(`✅ LLMAgent (Qwen fallback): Analysis complete.`);

  return {
    intent: data.intent || 'Customer request',
    explanation: data.explanation || data.analysis || transcription,
    language: data.language || 'auto-detected',
    model: 'qwen-local',
  };
}
