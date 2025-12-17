// Re-export Prisma enums to avoid type conflicts
import { MessageRole } from '@prisma/client';
export { ConversationStatus, MessageRole, AppointmentStatus } from '@prisma/client';

export interface InstagramWebhookEntry {
  id: string;
  time: number;
  messaging: InstagramMessaging[];
}

export interface InstagramMessaging {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: {
      type: string;
      payload: {
        url: string;
      };
    }[];
  };
}

export interface InstagramSendMessagePayload {
  recipient: {
    id: string;
  };
  message: {
    text: string;
  };
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
}

