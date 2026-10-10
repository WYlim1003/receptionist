import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Note: Ensure that the command path and args are configured via environment variables
// For a standard WhatsApp MCP server (e.g. running via npx or python)
const WHATSAPP_MCP_COMMAND = process.env.WHATSAPP_MCP_COMMAND || "npx";
const WHATSAPP_MCP_ARGS = process.env.WHATSAPP_MCP_ARGS 
  ? process.env.WHATSAPP_MCP_ARGS.split(" ") 
  : ["-y", "@modelcontextprotocol/server-whatsapp"]; // Replace with the actual WhatsApp MCP server package/command

export class WhatsAppMCPClient {
  constructor() {
    this.client = new Client(
      {
        name: "ai-receptionist-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.transport = null;
  }

  async connect() {
    try {
      console.log(`[MCP] Connecting to WhatsApp MCP Server via: ${WHATSAPP_MCP_COMMAND} ${WHATSAPP_MCP_ARGS.join(" ")}`);
      this.transport = new StdioClientTransport({
        command: WHATSAPP_MCP_COMMAND,
        args: WHATSAPP_MCP_ARGS,
      });

      // Capture and pipe stderr from the MCP server (important for seeing QR codes or errors)
      if (this.transport.stderr) {
        this.transport.stderr.pipe(process.stderr);
      } else {
        // Depending on sdk version, StdioClientTransport might not expose stderr directly
        // If it doesn't, we can't easily pipe it here unless we patch the sdk.
      }

      await this.client.connect(this.transport);
      console.log("[MCP] Connected to WhatsApp MCP Server");
    } catch (error) {
      console.error("[MCP] Error connecting to WhatsApp MCP Server:", error);
    }
  }

  async getTools() {
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error("[MCP] Error getting tools:", error);
      return [];
    }
  }

  async callTool(name, args) {
    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });
      return result;
    } catch (error) {
      console.error(`[MCP] Error calling tool ${name}:`, error);
      throw error;
    }
  }
  
  async close() {
    try {
      if (this.transport) {
        await this.transport.close();
        console.log("[MCP] Disconnected from WhatsApp MCP Server");
      }
    } catch (error) {
      console.error("[MCP] Error closing transport:", error);
    }
  }
}

export const whatsappMcpClient = new WhatsAppMCPClient();
