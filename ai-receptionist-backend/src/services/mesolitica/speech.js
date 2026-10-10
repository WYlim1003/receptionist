import fetch from 'node-fetch';

/**
 * Mesolitica Speech Model (Malaysian-Qwen2.5-7B-Speech-Instruct)
 * Since this is an instruction-based model, it typically processes chunks of audio 
 * rather than streaming frame-by-frame like Deepgram.
 * 
 * In a real production environment, you would use a dedicated streaming server (like WhisperLive)
 * or VLLM audio input endpoints. Here we provide the standard HTTP API call structure
 * for Hugging Face Inference API / local endpoint.
 */
export async function transcribeAudioChunk(audioBuffer, language = 'ms') {
  const endpoint = process.env.MESOLITICA_SPEECH_URL || 'http://localhost:8000/v1/audio/transcriptions';
  
  // Convert mulaw to wav buffer or base64 depending on endpoint requirement.
  // Assuming a standard OpenAI compatible whisper/speech endpoint here.
  
  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', 'mesolitica/Malaysian-Qwen2.5-7B-Speech-Instruct');
    formData.append('language', language);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MESOLITICA_API_KEY || 'dummy'}`,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Mesolitica STT error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('[Mesolitica ASR] Error:', error);
    return null;
  }
}
