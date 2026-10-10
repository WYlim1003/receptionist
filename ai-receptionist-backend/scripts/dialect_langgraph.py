import os
import torch
import soundfile as sf
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer, VitsModel, AutoProcessor

# --- Define the State for our LangGraph ---
class AgentState(TypedDict):
    filepath: str
    transcription: Optional[str]
    english_translation: Optional[str]
    cantonese_reply: Optional[str]
    audio_reply_path: Optional[str]
    error: Optional[str]

# --- Global Models (Lazy Loaded) ---
asr_pipe = None
llm_model = None
tokenizer = None
tts_processor = None
tts_model = None

def load_models():
    global asr_pipe, llm_model, tokenizer, tts_processor, tts_model
    if asr_pipe is None:
        print("Loading ASR (Whisper)...")
        asr_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-small", device_map="auto")
        print("Loading LLM (Qwen)...")
        llm_model_id = "Qwen/Qwen2.5-1.5B-Instruct"
        tokenizer = AutoTokenizer.from_pretrained(llm_model_id)
        llm_model = AutoModelForCausalLM.from_pretrained(llm_model_id, device_map="auto", torch_dtype="auto")
        print("Loading TTS (MMS Cantonese)...")
        tts_processor = AutoProcessor.from_pretrained("facebook/mms-tts-yue")
        tts_model = VitsModel.from_pretrained("facebook/mms-tts-yue")

# --- Node 1: Transcribe Agent ---
def transcribe_node(state: AgentState):
    print("-> [Node 1] Transcribing Audio...")
    try:
        result = asr_pipe(state["filepath"])
        return {"transcription": result["text"]}
    except Exception as e:
        return {"error": f"ASR Error: {str(e)}"}

# --- Node 2: Translate & Reply Agent ---
def translate_reply_node(state: AgentState):
    print("-> [Node 2] Generating Translation & Reply...")
    if state.get("error"): return state
    
    prompt = f"""You are a Malaysian Chinese assistant. 
A user sent this transcribed voice message: "{state['transcription']}"

Please provide:
1. English translation of the message.
2. A brief, friendly reply in Cantonese (using traditional Chinese characters).
Only provide the output in this format:
Translation: <english>
Reply: <cantonese reply>
"""
    messages = [{"role": "user", "content": prompt}]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(llm_model.device)
    
    generated_ids = llm_model.generate(**model_inputs, max_new_tokens=150)
    generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)]
    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    cantonese_reply = "你好，收到你的信息。" # Fallback
    english_translation = "Could not translate."
    
    if "Reply:" in response:
        cantonese_reply = response.split("Reply:")[1].strip()
    if "Translation:" in response:
        parts = response.split("Translation:")
        if "Reply:" in parts[1]:
            english_translation = parts[1].split("Reply:")[0].strip()
            
    return {
        "english_translation": english_translation,
        "cantonese_reply": cantonese_reply
    }

# --- Node 3: Text-to-Speech Agent ---
def synthesize_node(state: AgentState):
    print("-> [Node 3] Synthesizing Voice Reply...")
    if state.get("error"): return state
    
    try:
        inputs = tts_processor(text=state["cantonese_reply"], return_tensors="pt")
        with torch.no_grad():
            tts_output = tts_model(**inputs).waveform
        
        output_filepath = state["filepath"] + "_reply.wav"
        sf.write(output_filepath, tts_output[0].cpu().numpy(), tts_model.config.sampling_rate)
        
        return {"audio_reply_path": output_filepath}
    except Exception as e:
        return {"error": f"TTS Error: {str(e)}"}

# --- Build LangGraph Workflow ---
workflow = StateGraph(AgentState)
workflow.add_node("Transcriber", transcribe_node)
workflow.add_node("Translator", translate_reply_node)
workflow.add_node("Synthesizer", synthesize_node)

# Define the sequential line of nodes
workflow.set_entry_point("Transcriber")
workflow.add_edge("Transcriber", "Translator")
workflow.add_edge("Translator", "Synthesizer")
workflow.add_edge("Synthesizer", END)

# Compile the graph
app_graph = workflow.compile()

# --- FastAPI Server Setup ---
app = FastAPI()

class AudioRequest(BaseModel):
    filepath: str

@app.on_event("startup")
def startup_event():
    load_models()

@app.post("/process_audio")
async def process_audio(req: AudioRequest):
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=400, detail="Audio file not found")
    
    print(f"\n=== Starting LangGraph Workflow for {req.filepath} ===")
    
    # Run the LangGraph
    final_state = app_graph.invoke({"filepath": req.filepath})
    
    if final_state.get("error"):
        raise HTTPException(status_code=500, detail=final_state["error"])
        
    analysis_text = f"**Transcription:**\n{final_state['transcription']}\n\n**English Translation:**\n{final_state['english_translation']}\n\n**AI Cantonese Reply:**\n{final_state['cantonese_reply']}"

    return {
        "analysis": analysis_text,
        "audio_reply_path": final_state["audio_reply_path"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
