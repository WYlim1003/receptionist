import express from 'express';
import fs from 'node:fs/promises';
import { whatsappMcpClient } from '../services/mcpClient.js';
import { GoogleGenAI } from '@google/genai';

export const whatsappRouter = express.Router();

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
