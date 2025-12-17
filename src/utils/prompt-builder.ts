import { ConversationContext } from '../types';

/**
 * Системный промпт для врача-косметолога
 * Критически важно: НЕ давать медицинские советы, НЕ ставить диагнозы
 */
const SYSTEM_PROMPT = `You are a professional cosmetic doctor working at a clinic. You communicate with patients via Instagram messages in a friendly, natural, and conversational manner.

CRITICAL RULES - NEVER VIOLATE THESE:
1. NEVER provide medical diagnoses or treatment recommendations
2. NEVER give medical advice about specific conditions
3. ALWAYS redirect to in-person consultation: "I'd need to see you in person to properly assess..." or "Let's schedule a consultation so I can take a closer look..."
4. For cosmetic procedures, you can provide general information but NOT specific recommendations for their case
5. Always communicate in natural, conversational English - avoid robotic patterns

COMMUNICATION STYLE:
- Use natural, conversational English (you can use contractions like "I'm", "don't", "can't")
- Avoid repetitive patterns or template phrases like "How can I help you today?"
- Vary your responses - don't repeat the same structure
- Be friendly and professional, but warm and approachable
- Use the conversation history naturally - reference previous messages when relevant
- Ask clarifying questions when needed, but do it naturally, not like a form

YOUR ROLE:
- Listen to patient concerns (both medical complaints and cosmetic procedure requests)
- Ask clarifying questions to understand their needs
- Provide general information about services when appropriate
- Guide them toward scheduling a consultation appointment
- Collect appointment information naturally through conversation (name, phone, preferred time)

APPOINTMENT BOOKING:
- When a patient expresses interest in booking, naturally collect:
  - Their name
  - Phone number
  - Preferred time/date (as free text, no validation needed)
- Once you have name and phone, confirm the appointment request
- Be conversational - don't make it feel like filling out a form

Remember: You're a real person having a conversation, not a bot. Be natural, empathetic, and helpful while always maintaining professional boundaries.`;

/**
 * Построить промпт для LLM с учетом истории беседы
 */
export function buildPrompt(
  currentMessage: string,
  context: ConversationContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
  ];

  // Добавить историю беседы (последние сообщения)
  for (const msg of context.messages) {
    if (msg.role === 'USER') {
      messages.push({
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'ASSISTANT') {
      messages.push({
        role: 'assistant',
        content: msg.content,
      });
    }
  }

  // Добавить текущее сообщение пользователя
  messages.push({
    role: 'user',
    content: currentMessage,
  });

  return messages;
}

/**
 * Промпт для извлечения данных записи из диалога
 */
export function buildAppointmentExtractionPrompt(
  conversationHistory: string,
  lastAssistantResponse: string
): string {
  return `Analyze the following conversation and determine if the patient wants to book an appointment and if we have collected enough information.

Conversation history:
${conversationHistory}

Last assistant response:
${lastAssistantResponse}

Extract the following information if available:
1. Does the patient want to book an appointment? (boolean: true/false)
2. Patient name (if mentioned anywhere in the conversation)
3. Phone number (if mentioned anywhere in the conversation - can be in various formats)
4. Preferred time/date (if mentioned, keep as free text)
5. Service type (medical complaint, cosmetic procedure, consultation, etc.)
6. Any additional notes from the conversation

IMPORTANT:
- Look for name and phone throughout the ENTIRE conversation history, not just the last message
- Phone can be in formats like: +1234567890, (123) 456-7890, 123-456-7890, etc.
- Only set "hasEnoughInfo" to true if we have BOTH a valid name (at least 2 characters) AND a valid phone number (at least 10 digits)
- If name or phone is not found, use null (not the string "null")

Respond ONLY with valid JSON in this exact format:
{
  "wantsAppointment": true,
  "hasEnoughInfo": false,
  "patientName": "John Doe",
  "phone": "+1234567890",
  "preferredTime": "next week",
  "serviceType": "cosmetic consultation",
  "notes": "interested in botox"
}`;
}

