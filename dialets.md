Malaysian Chinese Dialect Voice Calling — LLM & Model Reference Guide
Purpose: Reference for selecting and implementing AI models in a voice-calling system that understands Hokkien, Cantonese, Hakka, Teochew, Hainanese, and other Malaysian Chinese dialects.
Date: 2026-10-10
Includes: Ready-to-use models + fine-tuning paths for adding more dialects
Table of Contents
1. Voice Calling Pipeline Overview
2. Speech-to-Text (ASR) Models
3. Text Understanding & Generation (LLM) Models
4. Text-to-Speech (TTS) Models
5. Multi-Dialect All-in-One Models
6. Malaysian-Specific Models
7. Datasets for Fine-Tuning
8. Training/Fine-Tuning Approaches for New Dialects
9. Recommended Architecture
10. Dialect Coverage Matrix
11. Quick Reference: Links & Licenses
1. Voice Calling Pipeline Overview
A voice-calling system needs three stages, each with its own model:
Caller speaks (Hokkien/Cantonese/Hakka/etc.)
        |
        v
  [STAGE 1: ASR]        Speech → Text transcription
        |
        v
  [STAGE 2: LLM]        Text understanding, reasoning, response generation
        |
        v
  [STAGE 3: TTS]        Text → Speech synthesis (respond in same dialect)
        |
        v
  Caller hears response
Key challenge: No single open-source model covers all Malaysian Chinese dialects across all three stages. This guide lists what exists and how to combine or train models to fill gaps.
2. Speech-to-Text (ASR) Models
2.1 Meta MMS (Massively Multilingual Speech) — Best All-in-One ASR
Field
Detail
Model
facebook/mms-1b-all
Hugging Face
https://huggingface.co/facebook/mms-1b-all
GitHub
https://github.com/facebookresearch/fairseq/tree/main/examples/mms
Architecture
Wav2Vec2 with language adapters
Parameters
1 billion
Languages
1,162 (including all major Chinese dialects)
License
CC-BY-NC 4.0 (non-commercial; check commercial licensing)
Sampling rate
16,000 Hz
Supported Malaysian Chinese dialects:
ISO 639-3 Code
Dialect
Status
nan
Min Nan / Hokkien
Supported (Taiwanese variant; partial Penang/Klang overlap)
yue-script_traditional
Cantonese
Supported
hak
Hakka
Supported
cmn-script_simplified
Mandarin
Supported
How to switch dialects at runtime:
from transformers import Wav2Vec2ForCTC, AutoProcessor
import torch

model_id = "facebook/mms-1b-all"
processor = AutoProcessor.from_pretrained(model_id)
model = Wav2Vec2ForCTC.from_pretrained(model_id)

# Switch to Hakka
processor.tokenizer.set_target_lang("hak")
model.load_adapter("hak")

# Switch to Cantonese
processor.tokenizer.set_target_lang("yue-script_traditional")
model.load_adapter("yue-script_traditional")

# Switch to Hokkien (Min Nan)
processor.tokenizer.set_target_lang("nan")
model.load_adapter("nan")
Limitation: ASR only — transcribes speech to text. Does not understand meaning. Taiwanese variants may miss Malaysian-specific loanwords (Malay/English borrowings in Penang Hokkien).
2.2 Whisper Fine-Tuned Models — Per-Dialect High Accuracy
Cantonese ASR
Model
HF Link
Base
Dialect
Notes
khleeloo/whisper-large-v3-cantonese
Link
Whisper Large v3
Cantonese
Fine-tuned on Cantonese speech data
simonl0909/whisper-large-v2-cantonese
Link
Whisper Large v2
Cantonese
Trained on Common Voice 11 yue dataset
WayneLinn/Whisper-Cantonese
Link
Whisper
Cantonese
Community fine-tune
hon9kon9ize/wav2vec2bert-jyutping
Link
Wav2Vec2-BERT
Cantonese → Jyutping
Outputs Jyutping romanization (0.6B params)
Cantonese ASR code example:
from transformers import pipeline

# Using Whisper fine-tuned for Cantonese
asr = pipeline("automatic-speech-recognition",
               model="khleeloo/whisper-large-v3-cantonese")

result = asr("audio_file.wav")
print(result["text"])  # Cantonese transcription in Chinese characters
Hakka ASR
Model
HF Link
Dialects Covered
Notes
formospeech/whisper-large-v3-taiwanese-hakka
Link
6 Hakka sub-dialects: Sixian, Hailu, Dapu, Raoping, Zhinan, Nansixian
Uses dialect ID as prompt — best Hakka ASR available
yfliao/whisper-hakka
Link
Taiwanese Hakka
Fine-tuning scripts + evaluation
Speech-AI-Research-Center/whisper-hakka
Link
Taiwanese Hakka
Alternative fine-tuning repository
Meta MMS hak
Link
General Hakka
Adapter-based, broader coverage
Hakka ASR with dialect selection:
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch

processor = WhisperProcessor.from_pretrained("formospeech/whisper-large-v3-taiwanese-hakka")
model = WhisperForConditionalGeneration.from_pretrained("formospeech/whisper-large-v3-taiwanese-hakka")

# Use dialect ID as prompt for Sixian dialect
forced_decoder_ids = processor.get_decoder_prompt_ids(language="sixian", task="transcribe")

# Process audio
input_features = processor(audio_array, sampling_rate=16000, return_tensors="pt").input_features
predicted_ids = model.generate(input_features, forced_decoder_ids=forced_decoder_ids)
transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)
Hokkien ASR
Model
Link
Notes
Meta MMS nan
HF Link
Min Nan / Hokkien — Taiwanese variant
sandy1990418/ChineseTaiwaneseWhisper
GitHub
Whisper fine-tuned for Chinese (Traditional) + Taiwanese
Gap: No dedicated Penang/Klang Hokkien ASR model exists. Meta MMS covers basic Min Nan but will miss Malaysian-specific vocabulary.
Teochew, Hainanese, Hockchew ASR
Dialect
Dedicated Model
Fallback
Teochew
None
Meta MMS nan (partial, low accuracy)
Hainanese
None
Meta MMS nan (partial, low accuracy)
Hockchew (Fuzhou)
None
None — requires fine-tuning
2.3 OpenAI Whisper (Base Models)
Model
Size
Languages
HF Link
openai/whisper-large-v3
1.5B
99 languages incl. Chinese (some Cantonese)
Link
openai/whisper-large-v3-turbo
809M
99 languages, faster
Link
openai/whisper-medium
769M
Chinese supported
Link
Use case: Base Whisper as a starting point for fine-tuning on Malaysian dialect data. Good Mandarin recognition out of the box.
3. Text Understanding & Generation (LLM) Models
3.1 Cantonese LLM (Most Mature)
Model
Params
Type
HF Link
License
hon9kon9ize/CantoneseLLM-v2.0-8B-Thinking
8B
Reasoning LLM (chain-of-thought)
Link
Apache 2.0 (base)
hon9kon9ize/CantoneseLLM-v2.0-30B-A3B-Thinking
30B (MoE)
Reasoning LLM
Link
Apache 2.0 (base)
hon9kon9ize/CantoneseLLMChat-v1.0-72B
73B
Chat LLM
Link
Apache 2.0 (base)
hon9kon9ize/ModernCantoneseBert-Base
0.1B
BERT (text understanding)
Link
MIT
hon9kon9ize/ERNIE-4.5-0.3B-Yue
0.4B
Small Cantonese LLM
Link
Apache 2.0
Research paper: "CantoneseLLM v2: Reasoning in a Low-Resource Language" (Sep 2026)
Cantonese LLM usage:
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "hon9kon9ize/CantoneseLLM-v2.0-8B-Thinking"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")

messages = [{"role": "user", "content": "你好，我想預約睇醫生"}]
input_ids = tokenizer.apply_chat_template(messages, return_tensors="pt")
output = model.generate(input_ids, max_new_tokens=512)
response = tokenizer.decode(output[0], skip_special_tokens=True)
3.2 Hokkien LLM
Model
Type
Link
Notes
lbh0830/TW-Hokkien-LLM (Taigi-Llama)
LLM
GitHub
Taiwanese Hokkien LLM based on Llama-2; includes translation model
whiai/translate-hokkien
Translation
GitHub
English ↔ Hokkien (POJ and Tai-Lo scripts)
Limitation: Taiwanese Hokkien variant. Malaysian/Penang Hokkien has significant loanword differences (Malay, English borrowings). Would need fine-tuning on Malaysian Hokkien data.
3.3 Hakka LLM
No dedicated Hakka text-generation LLM exists. Options:
1. Use Meta MMS TTS hak for Hakka text-to-speech
2. Use a general Chinese LLM (Qwen, Llama) and translate Hakka text to Mandarin first
3. Fine-tune a small LLM on Hakka text data (see Section 8)
3.4 General Chinese LLMs (Usable as Fallback)
Model
Params
Dialect Support
Link
Qwen/Qwen2.5-7B-Instruct
7B
Mandarin (strong), some dialect understanding
HF
Qwen/Qwen2.5-72B-Instruct
72B
Mandarin (strong)
HF
meta-llama/Llama-3.1-8B-Instruct
8B
English/Mandarin
HF
mistralai/Mistral-7B-Instruct-v0.3
7B
English/Chinese
HF
Use case: When a dialect-specific LLM doesn't exist, transcribe dialect speech to text (via ASR), then feed Mandarin translation to a general Chinese LLM for reasoning.
4. Text-to-Speech (TTS) Models
4.1 Meta MMS TTS (Multi-Dialect)
Model
Dialects
Link
facebook/mms-tts-hak
Hakka
HF
Meta MMS TTS (all languages)
1,000+ languages
HF
4.2 Cantonese TTS
Model
Type
Link
hon9kon9ize/Cantonese-TTS-playground
Interactive TTS
HF Space
hon9kon9ize/tts
Cantonese TTS model
HF Space
4.3 Hakka TTS
Model
Type
Link
Notes
VoxHakka
Multi-speaker Hakka TTS
Project
Based on YourTTS framework; high naturalness; supports multiple Hakka dialects
Meta MMS TTS hak
Hakka TTS
HF
Single-speaker, less natural
4.4 Malaysian TTS
Model
Params
Link
Notes
mesolitica/Malaysian-TTS-4B-v0.1
4B
HF
Malaysian context TTS
mesolitica/Malaysian-TTS-1.7B-v1
1.7B
HF
Lighter Malaysian TTS
mesolitica/Malaysian-TTS-0.6B-v1
0.6B
HF
Lightweight
mesolitica/StyleTTS2-MS
—
HF
Style-based Malaysian TTS
4.5 General-Purpose TTS
Model
Link
Notes
Coqui XTTS v2
HF
Multilingual, voice cloning, supports Chinese
StyleTTS 2
GitHub
Style-based, can be fine-tuned for dialects
VITS
GitHub
End-to-end TTS, can be fine-tuned per dialect
F5-TTS
GitHub
Flow-matching TTS, multilingual
5. Multi-Dialect All-in-One Models
5.1 Meta MMS (Best Single-Model Coverage)
Aspect
Detail
Model
facebook/mms-1b-all
ASR languages
1,162 (includes Hokkien, Cantonese, Hakka, Mandarin)
TTS languages
1,000+ (includes Hakka TTS)
Architecture
Wav2Vec2 with swappable language adapters
Switching
Runtime adapter swap — no model reload needed
License
CC-BY-NC 4.0
Hugging Face
https://huggingface.co/facebook/mms-1b-all
5.2 Whisper (Multi-Language Base for Fine-Tuning)
Aspect
Detail
Model
openai/whisper-large-v3
Languages
99 (includes Chinese)
Use case
Base model — fine-tune per dialect
License
MIT
Hugging Face
https://huggingface.co/openai/whisper-large-v3
5.3 SeamlessM4T (Meta — Translation + ASR + TTS)
Aspect
Detail
Model
facebook/hf-seamless-m4t-v2-large
Capabilities
ASR + TTS + Translation in one model
Languages
100+ (includes Chinese variants)
Use case
Speech-to-speech translation across dialects
License
CC-BY-NC 4.0
Hugging Face
https://huggingface.co/facebook/hf-seamless-m4t-v2-large
6. Malaysian-Specific Models
6.1 Mesolitica (MaLLaM) — Malaysian AI Company
Aspect
Detail
Organization
mesolitica (Kuala Lumpur)
Hugging Face
https://huggingface.co/mesolitica
Models
278 models on Hugging Face
Datasets
206 datasets
Focus
Bahasa Melayu, Manglish, Mandarin, Tamil, 16+ regional dialects
Key Models for Voice Calling:
Model
Purpose
Link
Malaysian-Qwen2.5-7B-Speech-Instruct
Speech understanding + instructions
HF
Malaysian-Qwen2.5-7B-Audio-Instruct
Audio instruction following
HF
Malaysian-Qwen2.5-7B-Dialect-Reasoning-GRPO
Dialect-specific reasoning (fine-tuned with GRPO)
HF
Malaysian-Qwen2.5-7B-Reasoning-SFT
General Malaysian reasoning
HF
Malaysian-Qwen2.5-1.5B-Reasoning-SFT
Lightweight reasoning
HF
nanot5-base-malaysian-translation-v2.1
Cross-language translation
HF
Malaysian-TTS-4B-v0.1
Malaysian TTS
HF
Malaysian-TTS-1.7B-v1
Mid-size Malaysian TTS
HF
Strengths: Malaysian context, Manglish, code-switching, local slang.
Weaknesses: Deep Hokkien/Cantonese/Hakka speech recognition is not primary focus.
6.2 Malaysian Chinese Skill (Claude Agent)
Aspect
Detail
Repo
jotterhans/malaysian-chinese-skill
Purpose
Teaches AI agents to write/chat in authentic Malaysian Chinese style
Use case
Text-level Malaysian Chinese context (not speech)
7. Datasets for Fine-Tuning
7.1 SEAME Corpus (Southeast Asian Mandarin-English)
Aspect
Detail
GitHub
zengzp0912/SEAME-dev-set
Content
Spontaneous Mandarin-English code-switching speech from Southeast Asia
Relevance
Contains Malaysian Mandarin with code-switching patterns
Use
Fine-tune ASR on Malaysian Mandarin patterns
7.2 Common Voice (Mozilla)
Aspect
Detail
Link
https://commonvoice.mozilla.org/
Dialect data
Cantonese (yue), some Min Nan
License
CC0
Use
ASR fine-tuning data
7.3 KeSpeech (Chinese Dialects)
Aspect
Detail
Coverage
8 Chinese dialects: Mandarin, Beijing, Southwest, Central Plains, Northeast, Lanyin, Jianghuai, Jilu, Jiaoliao
Relevance
Mainland Chinese dialects — not Malaysian, but methodology applicable
Use
Fine-tuning methodology for dialect ASR
7.4 HLTCHKUST Cantonese ASR Dataset
Aspect
Detail
GitHub
HLTCHKUST/cantonese-asr
Content
Cantonese speech data (.wav files)
Use
Cantonese ASR fine-tuning
7.5 Mesolitica Datasets (Malaysian)
Dataset
Size
Link
Malaysian-STT-Whisper
14.7M samples
HF
Malaysian-STT-Whisper-Stage2
10.5M samples
HF
Malaysian-TTS-v2
2.13M samples
HF
Malaysian-Translation
14.5M samples
HF
Malaysian-Emilia-v2
1.56M samples
HF
7.6 hon9kon9ize Cantonese Datasets
Dataset
Size
Link
hon9kon9ize/cpt-v2
627k
HF
hon9kon9ize/yue_asr_eval_dataset
7.63k
HF
hon9kon9ize/yue-wiki-pl-bert
176k
HF
hon9kon9ize/yue-all-nli
571k
HF
hon9kon9ize/mingpao-canada-news
1.07M
HF
8. Training/Fine-Tuning Approaches for New Dialects
8.1 ASR Fine-Tuning (Adding a New Dialect to Whisper)
Target: Add Penang Hokkien, Malaysian Teochew, or Hainanese to Whisper
Method: LoRA fine-tuning on Whisper Large v3
# Install dependencies
# pip install transformers datasets peft accelerate torch torchaudio

from transformers import WhisperProcessor, WhisperForConditionalGeneration, Seq2SeqTrainer
from datasets import load_dataset
from peft import LoraConfig, get_peft_model

# Load base model
processor = WhisperProcessor.from_pretrained("openai/whisper-large-v3")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3")

# Apply LoRA for efficient fine-tuning
config = LoraConfig(
    r=32,           # LoRA rank
    lora_alpha=64,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none"
)
model = get_peft_model(model, config)

# Load your dialect dataset (audio + transcription pairs)
# dataset = load_dataset("your_dialect_dataset")

# Train
trainer = Seq2SeqTrainer(
    model=model,
    processor=processor,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    # ... training args
)
trainer.train()
Data needed: Minimum ~10 hours of transcribed audio in the target dialect. More = better. Can use:
- Community recordings
- Phone call recordings (with consent)
- YouTube/podcast content in the dialect
8.2 LLM Fine-Tuning (Adding Dialect Text Understanding)
Target: Teach an LLM to understand and respond in Penang Hokkien, Malaysian Hakka, etc.
Method: SFT (Supervised Fine-Tuning) + DPO/GRPO on Qwen2.5 or Llama-3
# pip install trl transformers peft accelerate

from trl import SFTTrainer, SFTConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig

base_model = "Qwen/Qwen2.5-7B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(base_model)
model = AutoModelForCausalLM.from_pretrained(base_model, device_map="auto")

# LoRA config for efficient fine-tuning
peft_config = LoraConfig(
    r=64,
    lora_alpha=128,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Training data format (dialect instruction-response pairs):
# {"messages": [
#   {"role": "user", "content": "Lu ciak pa bo? (Hokkien: Have you eaten?)"},
#   {"role": "assistant", "content": "已经食饱了，多谢！"}
# ]}

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    peft_config=peft_config,
    args=SFTConfig(
        output_dir="./dialect-llm",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
    )
)
trainer.train()
Data needed:
- 5,000–50,000 instruction-response pairs in the dialect
- Can be generated by: translating existing instruction datasets, community contributions, parallel corpora
- For GRPO (reinforcement learning from preferences): preference pairs ranking better dialect responses over worse ones
8.3 TTS Fine-Tuning (Adding Dialect Voice Synthesis)
Target: Synthesize speech in Penang Hokkien, Malaysian Hakka, etc.
Method: Fine-tune VITS, StyleTTS2, or F5-TTS on dialect audio
Data needed:
- 1–5 hours of clean single-speaker audio in the target dialect
- Paired with text transcriptions
- For multi-speaker: 10+ hours across multiple speakers
Recommended base models:
- VITS — well-documented, many Chinese dialect fine-tunes exist
- StyleTTS2 — better prosody control, mesolitica/StyleTTS2-MS is Malaysian-adapted
- F5-TTS — newest, flow-matching, supports voice cloning with minimal data
8.4 Zero-Shot / Few-Shot Dialect Adaptation
For rapid prototyping without fine-tuning:
Approach
How
Dialects
Meta MMS zero-shot
mms-meta/mms-zeroshot-300m — trained on 1,150 languages, can attempt unseen dialects
Any
Whisper + prompt engineering
Use language="chinese" and provide dialect context in system prompt
Partial
LLM translation bridge
ASR → translate dialect to Mandarin → LLM processes → translate back → TTS in dialect
All (lower quality)
8.5 Data Collection Strategy for Malaysian Dialects
Source
Dialects
Method
Malaysian podcasts/YouTube
Hokkien, Cantonese, Hakka
Auto-download + transcribe with Meta MMS, manually correct
Community recordings
All dialects
Crowdsourcing app — native speakers record phrases
Malaysian radio archives
Hokkien, Cantonese
Historical broadcast recordings
Phone call recordings (with consent)
All
Opt-in collection from voice app users
SEAME corpus
Mandarin (Malaysian)
Already available — download from GitHub
Church/temple recordings
Hakka, Hokkien
Religious content in dialects
Minimum data targets per dialect:
Dialect
ASR (hours)
LLM (instruction pairs)
TTS (hours)
Penang/Klang Hokkien
50+
10,000+
5+
Malaysian Cantonese
20+ (leverages existing Cantonese models)
5,000+
3+
Malaysian Hakka
30+
5,000+
5+
Malaysian Teochew
50+
10,000+
5+
Malaysian Hainanese
50+
10,000+
5+