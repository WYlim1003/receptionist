import express from 'express';
import fs from 'node:fs/promises';
import { whatsappMcpClient } from '../services/mcpClient.js';
import { GoogleGenAI } from '@google/genai';

export const whatsappRouter = express.Router();

// Shared Gemini client (uses GEMINI_API_KEY from .env)
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

whatsappRouter.get('/messages', async (req, res, next) => {
  try {
    const groupName = process.env.WHATSAPP_GROUP_NAME || '无薪打工人';
    
    // 1. Fetch chats to get group ID if not cached
    const chatsResponse = await whatsappMcpClient.callTool('list_chats', { limit: 10, query: groupName });
    let groupId = process.env.WHATSAPP_GROUP_ID;

    if (chatsResponse && !chatsResponse.isError && chatsResponse.content && chatsResponse.content[0].text) {
      const textOutput = chatsResponse.content[0].text;
      if (!textOutput.includes('No chats found')) {
        const chats = JSON.parse(textOutput);
        if (chats.length > 0) {
          groupId = chats[0].jid || chats[0].id?._serialized || chats[0].id;
        }
      }
    }

    if (!groupId) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 2. Fetch messages for the group
    const messagesResponse = await whatsappMcpClient.callTool('list_messages', { 
      chat_jid: groupId,
      limit: 500
    });

    if (messagesResponse && !messagesResponse.isError && messagesResponse.content && messagesResponse.content[0].text) {
        let messages = [];
        try {
            messages = JSON.parse(messagesResponse.content[0].text);
        } catch (e) {
            console.error("Failed to parse messages JSON", e);
        }
        res.json({ messages });
    } else {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }

  } catch (error) {
    next(error);
  }
});

whatsappRouter.post('/analyze', async (req, res, next) => {
  try {
    const { filepath } = req.body;
    
    if (!filepath || !filepath.startsWith('[Audio] ')) {
      return res.status(400).json({ error: 'Invalid or missing audio filepath' });
    }

    const actualPath = filepath.replace('[Audio] ', '').trim();
    
    // Call our local Python dialect server
    const response = await fetch('http://127.0.0.1:8001/process_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: actualPath })
    });

    if (!response.ok) {
        throw new Error(`Dialect server returned ${response.status}`);
    }

    const data = await response.json();

    res.json({ 
        analysis: data.analysis,
        audio_reply_path: data.audio_reply_path 
    });

  } catch (error) {
    console.error("Analyze error:", error);
    next(error);
  }
});

// ── AGENT 3 endpoint: LLMAgent — understand intent via Gemini ──
whatsappRouter.post('/understand', async (req, res, next) => {
  try {
    const { transcription } = req.body;
    if (!transcription) return res.status(400).json({ error: 'Missing transcription' });

    const prompt = `You are an AI assistant helping a small business merchant in Malaysia.

A customer sent this voice message that has been transcribed:
"${transcription}"

Please respond in JSON with exactly these fields:
- "intent": A short label for what the customer wants (e.g. "Book appointment", "Ask for price", "Inquire about hours")
- "explanation": A clear 2-3 sentence explanation in English of what the customer means and what they want, written for the merchant
- "language": The language or dialect detected (e.g. "Malay", "Cantonese", "Hokkien", "Mandarin", "English")

Respond ONLY with valid JSON. No extra text.`;

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(text);

    res.json({
      intent: parsed.intent || 'Customer inquiry',
      explanation: parsed.explanation || text,
      language: parsed.language || 'auto-detected',
    });
  } catch (error) {
    console.error('Understand error:', error);
    next(error);
  }
});

// ── AGENT 5 endpoint: ReplyAgent — suggest 3 replies via Gemini ──
whatsappRouter.post('/suggest-replies', async (req, res, next) => {
  try {
    const { transcription, intent, explanation, language } = req.body;
    if (!intent) return res.status(400).json({ error: 'Missing intent' });

    const prompt = `You are an AI assistant helping a small business merchant in Malaysia reply to a customer.

Customer voice message transcription: "${transcription}"
Detected language/dialect: ${language}
Customer intent: ${intent}
Merchant explanation: ${explanation}

Generate exactly 3 reply options for the merchant to send back in WhatsApp.
Each reply should be professional, friendly, and appropriately brief for WhatsApp.
Match the reply language to the customer's language/dialect where appropriate.

CRITICAL INSTRUCTION: If the customer's intent is to book an appointment, AND they provide an exact date and time (or refer to "today", "tomorrow" etc), you should ALSO return an "autoBooked" object to schedule it. If you do this, the first reply option MUST be an auto-confirmation in exactly this format: "booked [date] + [time]". Assume today is ${new Date().toISOString().split('T')[0]} (Timezone: GMT+8).

Respond in JSON with this exact structure:
{
  "replies": [
    { "label": "✅ Auto-Confirm", "text": "booked 11 Oct + 3:00 PM (or whatever date/time they requested)", "tone": "professional" }
  ],
  "autoBooked": null // OR if booking detected: { "start_time": "ISO string", "end_time": "ISO string (+30 mins)", "service_name": "Hair colouring etc", "customer_name": "Extract from transcription if possible, else 'Customer'" }
}

Respond ONLY with a valid JSON object. No extra text.`;

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(text);

    // Backward compatibility if Gemini accidentally returns an array
    if (Array.isArray(parsed)) {
      res.json({ replies: parsed });
    } else {
      res.json(parsed);
    }
  } catch (error) {
    console.error('Suggest-replies error:', error);
    next(error);
  }
});
