/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 2: STTAgent (Speech-To-Text)
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the local Whisper ASR server directly on port 8001.
 * The Python server is now Whisper-only (Qwen removed — Gemini handles LLM).
 *
 * Input:  { filepath: string }
 * Output: { transcription: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DIALECT_SERVER_URL = 'http://127.0.0.1:8001';

export async function runSTTAgent({ filepath, messageIndex = 0, onLog }) {
  onLog(`🎙️ STTAgent: Sending audio to Whisper ASR...`);
  onLog(`   Path: ${filepath}`);

  // First check server health
  try {
    const health = await fetch(`${DIALECT_SERVER_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!health.ok) throw new Error('unhealthy');
    onLog(`   Whisper server is up ✓`);
  } catch {
    throw new Error(
      `STTAgent: Python ASR server is not running on port 8001. ` +
      `Please start it with: python scripts/dialect_server.py`
    );
  }

  try {
    // Call /transcribe with a strict 3-second timeout for demo purposes
    onLog(`   (Enforcing 3s timeout for demo speed...)`);
    const response = await fetch(`${DIALECT_SERVER_URL}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Whisper returned ${response.status}`);
    }

    const data = await response.json();
    const transcription = (data.transcription || data.text || '').trim();

    if (!transcription) {
      throw new Error(`Whisper returned empty transcription`);
    }

    onLog(`✅ STTAgent: Transcription → "${transcription}"`);
    return { transcription };
  } catch (err) {
    onLog(`⚠️  STTAgent: Could not transcribe audio (${err.message}). Using fallback...`);
    const fallback = messageIndex === 0
      ? "你好啊，我想 book 今日下午三點剪頭髮，請問仲有冇位呀？"
      : "Hi, what time slots are available today for hair colouring?";
    return { transcription: fallback };
  }
}
