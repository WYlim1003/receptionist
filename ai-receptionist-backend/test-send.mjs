import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "whatsapp-mcp-ts/src/main.ts"]
  });
  
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  console.log("Connected to MCP.");

  const response = await client.callTool({
    name: "send_message",
    arguments: {
      chat_jid: "120363407320101573@g.us",
      text: "Hello from AI Receptionist test! If you see this, the bot is connected to WhatsApp."
    }
  });

  console.log("Send Response:", response);
  process.exit(0);
}

main().catch(console.error);
