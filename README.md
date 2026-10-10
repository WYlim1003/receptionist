# AI Voice Desk 🎙️🧠

An AI-powered receptionist and booking system designed specifically for small business merchants in Malaysia. It integrates with WhatsApp to automatically fetch voice messages (including local dialects), transcribes them, extracts the customer's intent, explains it to the merchant in plain English, and provides 3 suggested contextual replies.

## ✨ Key Features
- **WhatsApp Integration:** Automatically fetches voice messages from WhatsApp groups/chats using the Model Context Protocol (MCP).
- **Dialect Support:** Powered by OpenAI's Whisper ASR to transcribe local dialects (like Hokkien, Cantonese, Mandarin, Malay) into text.
- **5-Agent AI Pipeline:** An orchestrated system of 5 specialized agents that process every incoming voice message:
  1. **FetchAgent 📡:** Pulls raw voice messages from the WhatsApp MCP server.
  2. **STTAgent 🎙️:** Sends audio files to a local Python FastAPI server running `openai/whisper-small` for speech-to-text.
  3. **LLMAgent 🧠:** Fast-path skips LLM for standard languages (English/Malay). For dialects, uses **Google Gemini 2.0 Flash** to understand intent and translate.
  4. **ExplainAgent 📋:** Formats the translation and intent into a clean, structured UI card for the merchant.
  5. **ReplyAgent 💬:** Uses **Google Gemini 2.0 Flash** to generate 3 context-aware suggested reply options (friendly, professional, casual).
- **Live Visualization Dashboard:** Watch the AI agents work in real-time with visual node statuses (Waiting → Running → Complete).

## 🏗️ Architecture
The project is split into two main components:

1. **`ai-receptionist-frontend` (Vite + React + Tailwind)**
   - Displays the agent pipeline dashboard.
   - Handles the orchestration logic (`src/lib/agents/orchestrator.js`).
   - Runs on port `5173`.

2. **`ai-receptionist-backend` (Node.js/Express + Python/FastAPI)**
   - **Express Server:** Connects to WhatsApp MCP, proxies STT requests, and queries Gemini. Runs on port `3001`.
   - **Python ASR Server:** Runs Whisper on CPU for reliable, fast local transcriptions without OOM issues. Runs on port `8001`.
   - **WhatsApp MCP Server:** Handles the Bailey's WhatsApp Web connection and sqlite database.

## 🚀 Getting Started

### Prerequisites
- Node.js (v22+)
- Python (3.10+)
- `ffmpeg` installed and in PATH
- Gemini API Key

### 1. Backend Setup
```bash
cd ai-receptionist-backend

# Install JS dependencies
npm install

# Create .env file
echo "GEMINI_API_KEY=your_gemini_api_key" > .env
echo "WHATSAPP_GROUP_NAME=无薪打工人" >> .env

# Setup Python environment for Whisper
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Running the Services
You need to run 3 separate processes:

**Terminal 1: Python ASR Server**
```bash
cd ai-receptionist-backend
venv\Scripts\activate
python scripts/dialect_server.py
```
*(Wait until it says "Uvicorn running on http://127.0.0.1:8001" and "[OK] Whisper loaded and ready")*

**Terminal 2: Node.js Backend & WhatsApp MCP**
```bash
cd ai-receptionist-backend
npm run dev
```

**Terminal 3: Frontend Vite Server**
```bash
cd ai-receptionist-frontend
npm install
npm run dev
```

### 3. Usage
1. Open `http://localhost:5173` in your browser.
2. Click **Fetch & Analyse** in the top right.
3. The dashboard will animate as the 5 agents process any new WhatsApp voice messages.

## 🔮 Future Improvements
- Add persistent call logs and database history.
- Add an interactive booking calendar UI (slots and appointments) that updates based on customer voice intent.
- Expand support for direct auto-replying via WhatsApp MCP.
