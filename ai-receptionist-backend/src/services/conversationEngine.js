import OpenAI from 'openai';
import { checkSlots, createBooking, getBusinessInfo, transferCall } from './bookingFunctions.js';

const openai = new OpenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
});
const MODEL = process.env.OPENAI_MODEL || 'gemini-2.5-flash';

// ── Tool definitions for function calling ──────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_slots',
      description: 'Get available booking time slots for a specific date and service.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format. Use "today" or "tomorrow" as shortcuts.',
          },
          service_id: {
            type: 'string',
            description: 'UUID of the service (from the available services list). Optional — omit to check all services.',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create a confirmed booking after collecting customer name, phone, slot, and service.',
      parameters: {
        type: 'object',
        properties: {
          slot_id: { type: 'string', description: 'UUID of the slot to book.' },
          service_id: { type: 'string', description: 'UUID of the service being booked.' },
          customer_name: { type: 'string', description: 'Full name of the customer.' },
          customer_phone: { type: 'string', description: 'Customer phone number (caller ID or one they provide).' },
          notes: { type: 'string', description: 'Any additional notes from the conversation.' },
        },
        required: ['slot_id', 'service_id', 'customer_name', 'customer_phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_business_info',
      description: 'Retrieve business information such as hours, address, services, or prices.',
      parameters: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            enum: ['hours', 'address', 'services', 'prices', 'all'],
            description: 'Which piece of business info to retrieve.',
          },
        },
        required: ['field'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_call',
      description: 'Transfer the call to the business owner when the AI cannot handle the request.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Brief reason for the transfer.' },
        },
        required: ['reason'],
      },
    },
  },
];

/**
 * Build the system prompt for the AI receptionist.
 */
function buildSystemPrompt(business, slots) {
  const serviceList = business.services
    ?.filter((s) => s.is_active)
    .map((s) => `- ${s.name} (${s.duration_min} min, RM${s.price || 'N/A'})`)
    .join('\n') || 'Services not loaded';

  const slotList = slots?.length
    ? slots.map((s) => `- ${s.label} (slot_id: ${s.id})`).join('\n')
    : 'No slots available today';

  const knowledgeBase = business.knowledge_base
    ? `\nBusiness Knowledge Base (Use this to answer FAQs contextually like Cleve AI):\n${business.knowledge_base}\n`
    : '';

  return `You are the AI receptionist for ${business.name}, a ${business.business_type || 'business'} located at ${business.address || 'our location'}.
Your job is to answer customer calls professionally and help them book appointments. You must understand Malaysian context, dialects (Manglish, Hokkien, Cantonese, Hakka) if spoken by the user.

Business hours: ${JSON.stringify(business.working_hours)}
Available services:
${serviceList}

Available slots today:
${slotList}
${knowledgeBase}
Rules:
1. Be warm, concise, and natural — like a real human receptionist. Never reveal you are an AI unless directly asked.
2. Always confirm the customer's name, phone number, chosen service, and time BEFORE calling create_booking.
3. If no slots are available today, offer the next available day by calling check_slots with tomorrow's date.
4. If the customer asks something you cannot handle, use transfer_call to forward to the owner.
5. Never invent information. If you don't know something, use get_business_info or say you'll check.
6. Keep responses SHORT (2-4 sentences max) — this is a phone call, not a chat.
7. Speak in ${business.language || 'English'} by default. If the customer speaks another language, switch naturally.
8. If a customer says "cancel", "reschedule", or sounds confused, offer to transfer to the owner.
9. Custom greeting: ${business.greeting_text || `Hi, you've reached ${business.name}! How can I help you today?`}`;
}

/**
 * ConversationEngine manages the LLM state for a single call.
 */
export class ConversationEngine {
  constructor({ business, callSid, callerNumber, onToolCall, onResponse }) {
    this.business = business;
    this.callSid = callSid;
    this.callerNumber = callerNumber;
    this.onToolCall = onToolCall;   // async (toolName, args) => result
    this.onResponse = onResponse;   // async (text) => void (send to TTS)
    this.onStateChange = arguments[0].onStateChange || (() => {});
    this.messages = [];
    this.todaySlots = [];
    this.isProcessing = false;
  }

  setTodaySlots(slots) {
    this.todaySlots = slots;
  }

  /**
   * Prime the conversation with the greeting.
   */
  async greet() {
    const greeting = this.business.greeting_text
      || `Hi, you've reached ${this.business.name}! How can I help you today?`;
    this.onStateChange('GREETING');
    this.messages.push({ role: 'assistant', content: greeting });
    await this.onResponse(greeting);
  }

  /**
   * Process a new user utterance and generate an AI response.
   * @param {string} userText - Transcribed text from Deepgram
   */
  async process(userText) {
    if (this.isProcessing) return; // debounce overlapping calls
    this.isProcessing = true;

    try {
      this.messages.push({ role: 'user', content: userText });

      this.onStateChange('INTENT_ANALYSIS');
      const systemPrompt = buildSystemPrompt(this.business, this.todaySlots);

      let response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.messages,
        ],
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 300,
      });

      let choice = response.choices[0];

      // ── Handle tool calls in a loop (may chain) ──────────
      while (choice.finish_reason === 'tool_calls') {
        const toolCalls = choice.message.tool_calls;
        this.messages.push(choice.message);

        const toolResults = [];
        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);
          console.log(`[LLM] Tool call: ${tc.function.name}`, args);

          if (tc.function.name === 'check_slots') this.onStateChange('CHECKING_SCHEDULE');
          if (tc.function.name === 'create_booking') this.onStateChange('BOOKING_CONFIRMED');

          let result;
          try {
            result = await this.onToolCall(tc.function.name, args);
          } catch (err) {
            result = { error: err.message };
          }

          toolResults.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        this.messages.push(...toolResults);

        // Continue with tool results
        response = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.messages,
          ],
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.4,
          max_tokens: 300,
        });
        choice = response.choices[0];
      }

      const assistantText = choice.message.content?.trim();
      if (assistantText) {
        this.messages.push({ role: 'assistant', content: assistantText });
        await this.onResponse(assistantText);
      }
      this.onStateChange('LISTENING_TRANSLATING');
    } catch (err) {
      console.error(`[LLM] Error processing message for call ${this.callSid}:`, err.message);
      await this.onResponse("I'm sorry, I had a technical issue. Please hold a moment.");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Returns the full conversation transcript.
   */
  getTranscript() {
    return this.messages
      .filter((m) => ['user', 'assistant'].includes(m.role))
      .map((m, i) => ({
        role: m.role,
        text: typeof m.content === 'string' ? m.content : '[tool call]',
        timestamp: new Date().toISOString(), // approximation
        index: i,
      }));
  }
}
