import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/message
 * Отправить сообщение и получить ответ
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
      });
    }

    const result = await chatService.sendMessage(
      message.trim(),
      conversationId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/chat/message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/chat/conversation/:id
 * Получить историю беседы
 */
router.get('/conversation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Conversation ID is required',
      });
    }

    const history = await chatService.getConversationHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error in /api/chat/conversation/:id:', error);
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    res.status(500).json({
      error: 'Failed to get conversation history',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/chat/conversation
 * Создать новую беседу
 */
router.post('/conversation', async (req: Request, res: Response) => {
  try {
    const result = await chatService.createNewConversation();
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/chat/conversation:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;

