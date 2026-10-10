import fetch from 'node-fetch';

/**
 * Mesolitica TTS (Malaysian-TTS-4B-v0.1)
 * Generates audio buffer from text in Malaysian dialects/Manglish.
 */
export async function generateTTS(text, voiceId = 'default') {
  const endpoint = process.env.MESOLITICA_TTS_URL || 'http://localhost:8000/v1/audio/speech';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MESOLITICA_API_KEY || 'dummy'}`,
      },
      body: JSON.stringify({
        model: 'mesolitica/Malaysian-TTS-4B-v0.1',
        input: text,
        voice: voiceId,
        response_format: 'wav' // Needs conversion to mulaw later for Twilio
      })
    });

    if (!response.ok) {
      throw new Error(`Mesolitica TTS error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Mesolitica TTS] Error:', error);
    return null;
  }
}
