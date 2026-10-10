/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 1: FetchAgent
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Connect to the WhatsApp MCP server through the backend, fetch messages
 *   from the configured group, and filter out only the voice/audio messages
 *   that need to be processed.
 *
 * Input:  none (reads config from backend env)
 * Output: { voiceMessages: Array<{ id, sender, timestamp, filepath }> }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = 'http://127.0.0.1:3001';

export async function runFetchAgent({ onLog }) {
  onLog('🔎 FetchAgent: Connecting to WhatsApp MCP server...');

  const response = await fetch(`${BACKEND_URL}/api/whatsapp/messages`);

  if (!response.ok) {
    throw new Error(`FetchAgent: Backend returned ${response.status} — is the Express server running?`);
  }

  const data = await response.json();
  const allMessages = data.messages || [];

  onLog(`FetchAgent: Retrieved ${allMessages.length} total messages from group.`);

  // Filter to only inbound audio messages
  const voiceMessages = allMessages.filter(
    (m) => !m.is_from_me && m.content && m.content.startsWith('[Audio]')
  );

  onLog(`✅ FetchAgent: Found ${voiceMessages.length} voice message(s) to process.`);

  return {
    voiceMessages: voiceMessages.map((m) => ({
      id: m.id,
      sender: m.sender_display || m.sender || 'Unknown',
      timestamp: m.timestamp,
      filepath: m.content.replace('[Audio] ', '').trim(),
      rawContent: m.content,
    })),
  };
}
