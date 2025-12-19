import { UserService } from './user.service';
import { ConversationService } from './conversation.service';
import { LLMService } from './llm.service';
import { AppointmentService } from './appointment.service';
import { MessageRole } from '../types';
import { ConversationStatus } from '@prisma/client';

export interface ChatMessageResponse {
  response: string;
  conversationId: string;
  appointmentCreated?: boolean;
}

export interface ConversationHistory {
  messages: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export class ChatService {
  private userService: UserService;
  private conversationService: ConversationService;
  private llmService: LLMService;
  private appointmentService: AppointmentService;
  private readonly WEB_CHAT_USER_ID = 'web-chat-user';

  constructor() {
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.llmService = new LLMService();
    this.appointmentService = new AppointmentService();
  }

  /**
   * Генерировать уникальный messageId для веб-чата
   */
  private generateWebMessageId(): string {
    return `web-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Получить или создать виртуального пользователя для веб-чата
   */
  private async getWebChatUser() {
    return await this.userService.findOrCreateUser(
      this.WEB_CHAT_USER_ID,
      'web-chat-user',
      'Web Chat User'
    );
  }

  /**
   * Отправить сообщение и получить ответ
   */
  async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<ChatMessageResponse> {
    // Получить или создать пользователя для веб-чата
    const user = await this.getWebChatUser();

    // Найти или создать активную беседу
    let activeConversationId: string;
    if (conversationId) {
      // Проверить, что беседа существует и принадлежит веб-чату пользователю
      const conversation = await this.conversationService.getConversationById(
        conversationId
      );
      if (conversation && conversation.userId === user.id) {
        activeConversationId = conversationId;
      } else {
        // Если беседа не найдена или принадлежит другому пользователю, создаем новую
        activeConversationId =
          await this.conversationService.findOrCreateActiveConversation(
            user.id
          );
      }
    } else {
      activeConversationId =
        await this.conversationService.findOrCreateActiveConversation(user.id);
    }

    // Сохранить сообщение пользователя
    const userMessageId = this.generateWebMessageId();
    await this.conversationService.saveMessage(
      activeConversationId,
      userMessageId,
      MessageRole.USER,
      message
    );

    // Получить контекст беседы
    const context = await this.conversationService.getConversationContext(
      activeConversationId
    );

    if (!context) {
      throw new Error('Failed to get conversation context');
    }

    // Генерировать ответ через LLM
    const response = await this.llmService.generateResponse(message, context);

    // Сохранить ответ ассистента
    const assistantMessageId = this.generateWebMessageId();
    await this.conversationService.saveMessage(
      activeConversationId,
      assistantMessageId,
      MessageRole.ASSISTANT,
      response
    );

    // Проверить, нужно ли создать запись на консультацию
    let appointmentCreated = false;
    const updatedContext = await this.conversationService.getConversationContext(
      activeConversationId
    );

    if (updatedContext) {
      const appointmentData = await this.llmService.extractAppointmentData(
        message,
        response,
        updatedContext
      );

      if (
        appointmentData &&
        appointmentData.patientName &&
        appointmentData.phone
      ) {
        try {
          await this.appointmentService.createAppointment({
            userId: user.id,
            conversationId: activeConversationId,
            patientName: appointmentData.patientName,
            phone: appointmentData.phone,
            serviceType: appointmentData.serviceType,
            preferredTime: appointmentData.preferredTime,
            notes: appointmentData.notes,
          });
          appointmentCreated = true;
        } catch (appointmentError: any) {
          console.error('Error creating appointment:', appointmentError);
          // Не прерываем выполнение, просто не отмечаем как созданное
        }
      }
    }

    return {
      response,
      conversationId: activeConversationId,
      appointmentCreated,
    };
  }

  /**
   * Создать новую беседу
   * Закрывает существующую активную беседу и создает новую
   */
  async createNewConversation(): Promise<{ conversationId: string }> {
    const user = await this.getWebChatUser();
    
    // Найти существующую активную беседу
    const existingConversationId =
      await this.conversationService.findOrCreateActiveConversation(user.id);
    const existingConversation = await this.conversationService.getConversationById(
      existingConversationId
    );
    
    // Закрыть существующую беседу, если она есть
    if (existingConversation) {
      await this.conversationService.updateConversationStatus(
        existingConversation.id,
        ConversationStatus.COMPLETED
      );
    }
    
    // Создать новую беседу (теперь findOrCreateActiveConversation создаст новую, т.к. старая закрыта)
    const conversationId =
      await this.conversationService.findOrCreateActiveConversation(user.id);
    return { conversationId };
  }

  /**
   * Получить историю беседы
   * Проверяет, что беседа принадлежит веб-чату пользователю
   */
  async getConversationHistory(
    conversationId: string
  ): Promise<ConversationHistory> {
    const user = await this.getWebChatUser();
    const conversation = await this.conversationService.getConversationById(
      conversationId
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Проверка безопасности: беседа должна принадлежать веб-чату пользователю
    if (conversation.userId !== user.id) {
      throw new Error('Conversation not found');
    }

    return {
      messages: conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
    };
  }
}

