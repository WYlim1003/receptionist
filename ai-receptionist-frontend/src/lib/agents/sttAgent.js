/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 2: STTAgent (Speech-To-Text)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Take a single voice message filepath and send it to the Python FastAPI
 *   dialect server running Whisper (openai/whisper-small). Returns the raw
 *   transcription text.
 *
 *   The Python server exposes /process_audio which returns both transcription
 *   and a local LLM analysis. This agent extracts only the transcription part
 *   and passes the raw analysis along so the LLMAgent can reuse it to avoid
 *   a double model call.
 *
 * Input:  { filepath: string }
 * Output: { transcription: string, _rawAnalysis?: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = 'http://127.0.0.1:3001';

export async function runSTTAgent({ filepath, onLog }) {
  onLog(`🎙️ STTAgent: Sending audio file to Whisper for transcription...`);
  onLog(`   Path: ${filepath}`);

  // Call backend /analyze which proxies to Python /process_audio
  // The backend expects the filepath in [Audio] <path> format
  const response = await fetch(`${BACKEND_URL}/api/whatsapp/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath: `[Audio] ${filepath}` }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`STTAgent: Backend /analyze returned ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const analysis = data.analysis || '';

  // Extract transcription from the combined analysis text
  // Format: "**Transcription:**\n<text>\n\n**Explanation for Merchant:**\n<text>"
  const transcriptionMatch = analysis.match(/\*\*Transcription:\*\*\s*([\s\S]+?)(?:\n\n|\*\*|$)/);
  const transcription = transcriptionMatch
    ? transcriptionMatch[1].trim()
    : analysis.split('\n')[0].trim();

  onLog(`✅ STTAgent: Transcription complete → "${transcription}"`);

  return {
    transcription,
    _rawAnalysis: analysis, // Pass through so LLMAgent can reuse Qwen output if Gemini is unavailable
  };
}
