/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORCHESTRATOR: VoiceMessagePipeline
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Coordinates all 5 agents in sequence for each voice message:
 *
 *   [1] FetchAgent   → Fetch voice messages from WhatsApp
 *   [2] STTAgent     → Whisper Speech-to-Text transcription
 *   [3] LLMAgent     → Gemini / Qwen intent understanding
 *   [4] ExplainAgent → Format merchant-facing explanation
 *   [5] ReplyAgent   → Generate 3 suggested reply options
 *
 * Usage:
 *   import { runPipeline } from './lib/agents/orchestrator.js';
 *   const results = await runPipeline({ onLog, onNodeUpdate });
 *
 * onLog(message: string)            — called for every agent log line
 * onNodeUpdate(nodeId, status)      — called to update UI node state
 *   status: 'idle' | 'running' | 'done' | 'error'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { runFetchAgent } from './fetchAgent.js';
import { runSTTAgent } from './sttAgent.js';
import { runLLMAgent } from './llmAgent.js';
import { runExplainAgent } from './explainAgent.js';
import { runReplyAgent } from './replyAgent.js';

// ── Node definitions for UI visualization ──────────────────
export const PIPELINE_NODES = [
  {
    id: 'fetch',
    label: 'FetchAgent',
    icon: '📡',
    description: 'Connects to WhatsApp MCP and fetches voice messages from the group chat',
    color: 'blue',
  },
  {
    id: 'stt',
    label: 'STTAgent',
    icon: '🎙️',
    description: 'Sends audio file to Whisper ASR model for Speech-to-Text transcription',
    color: 'purple',
  },
  {
    id: 'llm',
    label: 'LLMAgent',
    icon: '🧠',
    description: 'Uses Gemini (or Qwen fallback) to understand customer intent and dialect',
    color: 'amber',
  },
  {
    id: 'explain',
    label: 'ExplainAgent',
    icon: '📋',
    description: 'Formats the analysis into a clear, structured explanation for the merchant',
    color: 'green',
  },
  {
    id: 'reply',
    label: 'ReplyAgent',
    icon: '💬',
    description: 'Generates 3 contextual suggested reply options for the merchant to send',
    color: 'emerald',
  },
];

/**
 * Run the full pipeline for ALL fetched voice messages.
 *
 * @param {object} options
 * @param {function} options.onLog          - (message: string) => void
 * @param {function} options.onNodeUpdate   - (nodeId: string, status: string) => void
 * @param {function} options.onResult       - (result: ProcessedMessage) => void — called per message
 * @returns {Promise<ProcessedMessage[]>}
 */
export async function runPipeline({ onLog, onNodeUpdate, onResult }) {
  const log = (msg) => { console.log(msg); onLog?.(msg); };
  const node = (id, status) => onNodeUpdate?.(id, status);

  log('════════════════════════════════════════════════');
  log('  🚀 VoiceDesk Agent Pipeline — Starting...');
  log('════════════════════════════════════════════════');

  const results = [];

  // ── AGENT 1: FetchAgent ───────────────────────────────────
  node('fetch', 'running');
  log('\n── Node 1: FetchAgent ──────────────────────────');

  let voiceMessages;
  try {
    const fetchResult = await runFetchAgent({ onLog: log });
    voiceMessages = fetchResult.voiceMessages;
    node('fetch', 'done');
  } catch (err) {
    log(`❌ FetchAgent failed: ${err.message}`);
    node('fetch', 'error');
    throw err;
  }

  if (voiceMessages.length === 0) {
    log('\n⚠️  No voice messages found. Pipeline complete (no items to process).');
    node('stt', 'idle');
    node('llm', 'idle');
    node('explain', 'idle');
    node('reply', 'idle');
    return [];
  }

  // ── Process each voice message through agents 2–5 ────────
  for (let i = 0; i < voiceMessages.length; i++) {
    const msg = voiceMessages[i];
    log(`\n══ Processing message ${i + 1}/${voiceMessages.length} from ${msg.sender} ══`);

    const result = {
      id: msg.id,
      sender: msg.sender,
      timestamp: msg.timestamp,
      filepath: msg.filepath,
    };

    // ── AGENT 2: STTAgent ─────────────────────────────────
    node('stt', 'running');
    log('\n── Node 2: STTAgent ────────────────────────────');

    let transcription;
    let _rawAnalysis; // may contain full analysis from fallback

    try {
      const sttResult = await runSTTAgent({ filepath: msg.filepath, messageIndex: i, onLog: log });
      transcription = sttResult.transcription;
      _rawAnalysis = sttResult._rawAnalysis; // only populated on fallback
      result.transcription = transcription;
      node('stt', 'done');
    } catch (err) {
      log(`❌ STTAgent failed: ${err.message}`);
      node('stt', 'error');
      result.error = err.message;
      results.push(result);
      onResult?.(result);
      continue; // Skip remaining agents for this message
    }

    // ── QUICK CHECK: Standard Language Bypass ─────────────
    const requiresTranslation = /[^\x00-\x7F]/.test(transcription); // Has non-ASCII (e.g. Chinese characters)

    let intent, explanation, language, llmModel;

    if (!requiresTranslation) {
      // ── SILENT BYPASS FOR ENGLISH/MALAY ──
      node('llm', 'idle'); // Visually skip
      node('explain', 'idle'); // Visually skip

      intent = 'Direct Inquiry';
      explanation = 'Standard language detected. Please refer directly to the transcription.';
      language = 'English / Malay';
      llmModel = 'skipped (fast-path)';

      // Silently generate display card without logging
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown time';
      result.summary = explanation;
      result.displayCard = {
        sender: msg.sender,
        timestamp: timeStr,
        language,
        transcription,
        intent,
        explanation,
        sections: [
          { label: '🗣️ What they said (transcribed)', content: transcription, type: 'transcription' },
          { label: '🌐 Language / Dialect', content: language, type: 'badge' }
        ],
      };
    } else {
      // ── AGENT 3: LLMAgent ─────────────────────────────────
      node('llm', 'running');
      log('\n── Node 3: LLMAgent ────────────────────────────');

      try {
        if (_rawAnalysis) {
          log('   LLMAgent: Using pre-analyzed result from STT fallback...');
          const explainMatch = _rawAnalysis.match(/\*\*Explanation for Merchant:\*\*\s*([\s\S]+)/);
          intent = 'Customer request';
          explanation = explainMatch ? explainMatch[1].trim() : _rawAnalysis;
          language = 'auto-detected';
          llmModel = 'qwen-local (via fallback)';
          log(`✅ LLMAgent: Parsed from fallback → intent="${intent}"`);
        } else {
          const llmResult = await runLLMAgent({ transcription, onLog: log });
          intent = llmResult.intent;
          explanation = llmResult.explanation;
          language = llmResult.language;
          llmModel = llmResult.model;
        }
        node('llm', 'done');
      } catch (err) {
        log(`❌ LLMAgent failed: ${err.message}`);
        node('llm', 'error');
        result.error = err.message;
        results.push(result);
        onResult?.(result);
        continue;
      }

      result.intent = intent;
      result.explanation = explanation;
      result.language = language;
      result.llmModel = llmModel;

      // ── AGENT 4: ExplainAgent ─────────────────────────────
      node('explain', 'running');
      log('\n── Node 4: ExplainAgent ────────────────────────');

      try {
        const explainResult = runExplainAgent({
          transcription,
          intent,
          explanation,
          language,
          sender: msg.sender,
          timestamp: msg.timestamp,
          onLog: log,
        });

        result.summary = explainResult.summary;
        result.displayCard = explainResult.displayCard;
        node('explain', 'done');
      } catch (err) {
        log(`❌ ExplainAgent failed: ${err.message}`);
        node('explain', 'error');
        result.error = err.message;
        results.push(result);
        onResult?.(result);
        continue;
      }
    }

    // ── AGENT 5: ReplyAgent ───────────────────────────────
    node('reply', 'running');
    log('\n── Node 5: ReplyAgent ──────────────────────────');

    try {
      const replyResult = await runReplyAgent({
        transcription,
        intent,
        explanation,
        language,
        onLog: log,
      });

      result.replies = replyResult.replies;
      result.replyModel = replyResult.model;
      node('reply', 'done');
    } catch (err) {
      log(`❌ ReplyAgent failed: ${err.message}`);
      node('reply', 'error');
      // Reply failure is non-fatal — still return the result
      result.replies = [];
    }

    log(`\n✅ Message from ${msg.sender} fully processed.`);
    results.push(result);
    onResult?.(result);
  }

  log('\n════════════════════════════════════════════════');
  log(`  ✅ Pipeline complete. Processed ${results.length} message(s).`);
  log('════════════════════════════════════════════════\n');

  return results;
}
