export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

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

