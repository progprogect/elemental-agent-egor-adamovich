import { ConversationStatus, MessageRole } from '@prisma/client';
import { ConversationContext } from '../types';
import { prisma } from '../lib/prisma';

export class ConversationService {
  /**
   * Найти или создать активную беседу для пользователя
   */
  async findOrCreateActiveConversation(userId: string): Promise<string> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        userId,
        status: ConversationStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (conversation) {
      return conversation.id;
    }

    const newConversation = await prisma.conversation.create({
      data: {
        userId,
        status: ConversationStatus.ACTIVE,
      },
    });

    return newConversation.id;
  }

  /**
   * Загрузить историю беседы для контекста (последние N сообщений)
   */
  async getConversationContext(
    conversationId: string,
    limit: number = 15
  ): Promise<ConversationContext | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: true,
      },
    });

    if (!conversation) {
      return null;
    }

    // Получить последние N сообщений (сначала берем последние, потом сортируем по возрастанию для контекста)
    const totalMessages = await prisma.message.count({
      where: { conversationId },
    });

    const skip = Math.max(0, totalMessages - limit);
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    return {
      conversationId: conversation.id,
      userId: conversation.userId,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };
  }

  /**
   * Сохранить сообщение в беседу
   * Возвращает true если сообщение было сохранено, false если уже существует
   */
  async saveMessage(
    conversationId: string,
    instagramMessageId: string,
    role: MessageRole,
    content: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      await prisma.message.create({
        data: {
          conversationId,
          instagramMessageId,
          role,
          content,
          metadata: metadata || undefined,
        },
      });

      // Обновить время последнего обновления беседы
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return true;
    } catch (error: any) {
      // Если сообщение уже существует (дубликат от Instagram), просто игнорируем
      if (error.code === 'P2002' && error.meta?.target?.includes('instagramMessageId')) {
        console.log(`Message ${instagramMessageId} already exists, skipping duplicate`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Проверить, существует ли сообщение с данным instagramMessageId
   */
  async messageExists(instagramMessageId: string): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { instagramMessageId },
      select: { id: true },
    });
    return !!message;
  }

  /**
   * Обновить статус беседы
   */
  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });
  }

  /**
   * Получить беседу по ID
   */
  async getConversationById(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}

