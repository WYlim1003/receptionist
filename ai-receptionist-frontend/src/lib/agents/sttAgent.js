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

export async function runSTTAgent({ filepath, onLog }) {
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

  // Call /transcribe
  const response = await fetch(`${DIALECT_SERVER_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`STTAgent: Whisper returned ${response.status} — ${err.detail}`);
  }

  const data = await response.json();
  const transcription = (data.transcription || data.text || '').trim();

  if (!transcription) {
    throw new Error(`STTAgent: Whisper returned empty transcription for ${filepath}`);
  }

  onLog(`✅ STTAgent: Transcription → "${transcription}"`);
  return { transcription };
}
