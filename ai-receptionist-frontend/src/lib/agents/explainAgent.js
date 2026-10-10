/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 4: ExplainAgent (Merchant Explanation)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Format and present the LLM's understanding of the customer message in a
 *   clear, concise summary specifically designed for the merchant to read.
 *   Includes the original transcription, detected language, customer intent,
 *   and a plain-English explanation of what the customer wants.
 *
 * Input:  { transcription, intent, explanation, language, sender, timestamp }
 * Output: { summary: string, displayCard: object }
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function runExplainAgent({ transcription, intent, explanation, language, sender, timestamp, onLog }) {
  onLog(`📋 ExplainAgent: Formatting merchant explanation...`);

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown time';

  // Build a structured display card for the UI
  const displayCard = {
    sender,
    timestamp: timeStr,
    language,
    transcription,
    intent,
    explanation,
    sections: [
      {
        label: '🗣️ What they said (transcribed)',
        content: transcription,
        type: 'transcription',
      },
      {
        label: '🌐 Language / Dialect',
        content: language,
        type: 'badge',
      },
      {
        label: '💡 Customer Intent',
        content: intent,
        type: 'intent',
      },
      {
        label: '📝 Explanation for Merchant',
        content: explanation,
        type: 'explanation',
      },
    ],
  };

  // Plain text summary for display/logging
  const summary = [
    `From: ${sender} (${timeStr})`,
    `Language: ${language}`,
    `Transcription: ${transcription}`,
    `Intent: ${intent}`,
    `Explanation: ${explanation}`,
  ].join('\n');

  onLog(`✅ ExplainAgent: Merchant summary ready.`);
  onLog(`   Intent: "${intent}"`);

  return { summary, displayCard };
}
