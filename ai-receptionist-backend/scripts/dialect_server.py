"""
dialect_server.py — Whisper-only ASR server
────────────────────────────────────────────
Responsibility: Speech-to-Text ONLY.
The LLM understanding (intent, explanation, suggested replies) is now handled
by Gemini via the Node.js backend (Agents 3 & 5).

This server only loads openai/whisper-small and exposes:
  POST /process_audio  { filepath } → { transcription }
  POST /transcribe     { filepath } → { transcription }   (alias)
  GET  /health                      → { status: "ok" }
"""

import os
import imageio_ffmpeg

# Ensure ffmpeg from imageio-ffmpeg is on PATH for Whisper
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="VoiceDesk ASR Server", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Whisper (ASR only — Qwen removed, handled by Gemini) ──
print("=" * 50)
print("  VoiceDesk ASR Server — Loading Whisper...")
print("=" * 50)

asr_pipe = pipeline(
    "automatic-speech-recognition",
    model="openai/whisper-small",
    device_map="auto",
)

print("✅ Whisper loaded and ready.")
print("=" * 50)


class AudioRequest(BaseModel):
    filepath: str


@app.get("/health")
async def health():
    return {"status": "ok", "model": "whisper-small"}


@app.post("/transcribe")
async def transcribe(req: AudioRequest):
    """Dedicated transcription-only endpoint."""
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {req.filepath}")

    try:
        print(f"[STT] Transcribing: {req.filepath}")
        result = asr_pipe(req.filepath)
        transcription = result["text"].strip()
        print(f"[STT] Result: {transcription}")
        return {"transcription": transcription}
    except Exception as e:
        print(f"[STT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process_audio")
async def process_audio(req: AudioRequest):
    """
    Legacy endpoint — kept for backward compatibility.
    Now returns only transcription wrapped in the old analysis format.
    The Node.js backend (Gemini) handles explanation and reply generation.
    """
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {req.filepath}")

    try:
        print(f"[STT] process_audio: {req.filepath}")
        result = asr_pipe(req.filepath)
        transcription = result["text"].strip()
        print(f"[STT] Transcription: {transcription}")

        # Return in the legacy format so the existing backend route still works
        analysis_text = f"**Transcription:**\n{transcription}\n\n**Explanation for Merchant:**\nTranscription complete. Gemini will analyse intent."

        return {
            "transcription": transcription,
            "analysis": analysis_text,
            "audio_reply_path": None,
        }
    except Exception as e:
        print(f"[STT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
