import os
import torch
import soundfile as sf
import imageio_ffmpeg

# Ensure ffmpeg.exe from imageio-ffmpeg can be found by Whisper/Librosa
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer, VitsModel, AutoProcessor

app = FastAPI()

# 1. Load ASR Model (Whisper)
print("Loading ASR Model...")
asr_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-small", device_map="auto")

# 2. Load LLM (Qwen for instruction and reasoning)
print("Loading LLM...")
llm_model_id = "Qwen/Qwen2.5-1.5B-Instruct" # Using 1.5B for faster local execution
tokenizer = AutoTokenizer.from_pretrained(llm_model_id)
llm_model = AutoModelForCausalLM.from_pretrained(llm_model_id, device_map="auto", torch_dtype="auto")

from gtts import gTTS

class AudioRequest(BaseModel):
    filepath: str

@app.post("/process_audio")
async def process_audio(req: AudioRequest):
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=400, detail="Audio file not found")
    
    try:
        # Stage 1: ASR
        print(f"Transcribing {req.filepath}...")
        asr_result = asr_pipe(req.filepath)
        transcription = asr_result["text"]
        print(f"Transcription: {transcription}")

        # Stage 2: LLM (Understand & Generate Reply)
        prompt = f"""You are an assistant for a merchant. 
A customer sent this transcribed voice message: "{transcription}"

Please provide a brief, clear explanation to the merchant about what the customer means or wants. Keep it short and helpful.
"""
        
        messages = [{"role": "user", "content": prompt}]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        model_inputs = tokenizer([text], return_tensors="pt").to(llm_model.device)
        
        generated_ids = llm_model.generate(**model_inputs, max_new_tokens=150)
        generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)]
        
        llm_response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        print(f"LLM Response:\n{llm_response}")

        # Format final analysis text
        analysis_text = f"**Transcription:**\n{transcription}\n\n**Explanation for Merchant:**\n{llm_response}"

        return {
            "analysis": analysis_text,
            "audio_reply_path": None
        }

    except Exception as e:
        print(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
