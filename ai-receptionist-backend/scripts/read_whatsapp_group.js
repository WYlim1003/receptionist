import 'dotenv/config';
import { whatsappMcpClient } from '../src/services/mcpClient.js';

async function readGroupMessages(groupName) {
  try {
    console.log(`Connecting to WhatsApp MCP Server...`);
    await whatsappMcpClient.connect();
    
    // In a typical WhatsApp MCP Server, there are tools to list chats or read messages
    console.log(`\nFetching available tools...`);
    const tools = await whatsappMcpClient.getTools();
    // Wait for the client to initialize
    console.log(`\nWaiting 15 seconds for WhatsApp client to be ready...`);
    await new Promise(r => setTimeout(r, 15000));

    
    // Use 'list_chats' with a query to find the group directly
    console.log(`\nFetching all chats to find group: ${groupName}...`);
    let targetChatId = null;
    try {
      const chatsResponse = await whatsappMcpClient.callTool('list_chats', { limit: 10, query: groupName });
      if (chatsResponse && chatsResponse.isError) {
          console.warn(`Tool returned an error:`, chatsResponse.content[0].text);
      } else if (chatsResponse && chatsResponse.content && chatsResponse.content[0].text) {
          try {
              const textOutput = chatsResponse.content[0].text;
              if (textOutput.includes('No chats found')) {
                  console.log(`Could not find a chat named '${groupName}'`);
              } else {
                  const chats = JSON.parse(textOutput);
                  if (chats.length > 0) {
                      const targetChat = chats[0];
                      targetChatId = targetChat.jid || targetChat.id?._serialized || targetChat.id;
                      console.log(`Found group ID: ${targetChatId}`);
                  }
              }
          } catch (parseErr) {
              console.warn(`Failed to parse chats response:`, parseErr.message);
          }
      }
    } catch (err) {
      console.warn(`Could not fetch chats automatically. Error: ${err.message}`);
    }

    // Assuming there is a tool like 'list_messages'
    // If you already know the chat ID for '无薪打工人', you could pass it directly here
    const fallbackChatId = process.env.WHATSAPP_GROUP_ID || "unknown_id"; 
    
    console.log(`\nReading messages for group...`);
    try {
      if (targetChatId || fallbackChatId !== "unknown_id") {
          const messages = await whatsappMcpClient.callTool('list_messages', { 
            chat_jid: targetChatId || fallbackChatId,
            limit: 50
          });
          console.log('Recent messages:\n', JSON.stringify(messages, null, 2));
      } else {
          console.log('No valid Group ID found. Please set WHATSAPP_GROUP_ID.');
      }
    } catch (err) {
      console.warn(`Could not read messages. Error: ${err.message}`);
    }

  } catch (error) {
    console.error('Error in readGroupMessages:', error);
  } finally {
    await whatsappMcpClient.close();
    process.exit(0);
  }
}

readGroupMessages('无薪打工人');
