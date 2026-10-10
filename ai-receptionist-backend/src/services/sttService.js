import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Create a Deepgram live transcription connection for a phone call.
 * Returns a connection object you can pipe audio into.
 *
 * @param {Object} options
 * @param {string}   options.callSid     - Twilio call SID (for logging)
 * @param {string}   [options.language]  - BCP-47 language code (default: 'en')
 * @param {Function} options.onTranscript - Called with (text, isFinal)
 * @param {Function} [options.onError]   - Called with (error)
 */
export function createDeepgramConnection({ callSid, language = 'en', onTranscript, onError }) {
  const connection = deepgram.listen.live({
    model: 'nova-3',
    language,
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,      // fire utterance_end after 1s silence
    vad_events: true,            // voice activity detection
    encoding: 'mulaw',           // Twilio uses μ-law 8kHz
    sample_rate: 8000,
    channels: 1,
    punctuate: true,
    endpointing: 300,            // 300ms silence = end of utterance
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[STT] Deepgram connected for call ${callSid}`);
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data.channel?.alternatives?.[0];
    if (!alt?.transcript) return;

    const isFinal = data.is_final;
    const text = alt.transcript.trim();

    if (text) {
      onTranscript(text, isFinal);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    // Can be used to interrupt TTS playback (barge-in)
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    // Utterance ended — LLM can process the buffered transcript
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error(`[STT] Deepgram error on call ${callSid}:`, err);
    if (onError) onError(err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[STT] Deepgram closed for call ${callSid}`);
  });

  return connection;
}
