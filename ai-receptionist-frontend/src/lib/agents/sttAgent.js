/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 2: STTAgent (Speech-To-Text)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Take a single voice message filepath and send it to the Python FastAPI
 *   dialect server running Whisper (openai/whisper-small). Returns the raw
 *   transcription text.
 *
 * Input:  { filepath: string }
 * Output: { transcription: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DIALECT_SERVER_URL = 'http://127.0.0.1:8001';

export async function runSTTAgent({ filepath, onLog }) {
  onLog(`🎙️ STTAgent: Sending audio file to Whisper for transcription...`);
  onLog(`   Path: ${filepath}`);

  const response = await fetch(`${DIALECT_SERVER_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath }),
  });

  if (!response.ok) {
    // Fallback: call full process_audio and extract only transcription portion
    onLog(`⚠️  STTAgent: /transcribe not found, falling back to /process_audio for transcription...`);
    return await _fallbackTranscribeViaProcessAudio({ filepath, onLog });
  }

  const data = await response.json();
  const transcription = data.transcription || data.text || '';

  onLog(`✅ STTAgent: Transcription complete → "${transcription}"`);

  return { transcription };
}

async function _fallbackTranscribeViaProcessAudio({ filepath, onLog }) {
  const BACKEND_URL = 'http://127.0.0.1:3001';

  const response = await fetch(`${BACKEND_URL}/api/whatsapp/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filepath: `[Audio] ${filepath}` }),
  });

  if (!response.ok) {
    throw new Error(`STTAgent: Fallback failed — backend returned ${response.status}`);
  }

  const data = await response.json();
  const analysis = data.analysis || '';

  // Extract transcription line from the combined analysis text
  const transcriptionMatch = analysis.match(/\*\*Transcription:\*\*\s*(.+?)(\n|$)/s);
  const transcription = transcriptionMatch
    ? transcriptionMatch[1].trim()
    : analysis.split('\n')[0];

  onLog(`✅ STTAgent (fallback): Extracted transcription → "${transcription}"`);
  return { transcription, _rawAnalysis: analysis };
}
