import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/instagram.service';
import { UserService } from '../services/user.service';
import { ConversationService } from '../services/conversation.service';
import { LLMService } from '../services/llm.service';
import { AppointmentService } from '../services/appointment.service';
import { MessageRole, InstagramMessaging } from '../types';

const router = Router();
const instagramService = new InstagramService();
const userService = new UserService();
const conversationService = new ConversationService();
const llmService = new LLMService();
const appointmentService = new AppointmentService();

// Webhook verification (GET request from Meta)
router.get('/instagram', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook handler (POST request from Meta)
router.post('/instagram', async (req: Request, res: Response) => {
  // Отвечаем Meta сразу, чтобы избежать таймаутов
  res.status(200).send('OK');

  try {
    const body = req.body;

    // Обработка входящих сообщений
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            await handleMessage(messaging);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

async function handleMessage(messaging: InstagramMessaging) {
  let senderId: string | null = null;
  
  try {
    senderId = messaging.sender.id;
    const messageText = messaging.message?.text;
    const messageId = messaging.message?.mid;

    if (!messageText || !messageId) {
      console.log('Received non-text message or missing message ID, skipping');
      return;
    }

    // Проверить, не обрабатывали ли мы это сообщение уже (защита от дубликатов от Instagram)
    const messageAlreadyExists = await conversationService.messageExists(messageId);
    if (messageAlreadyExists) {
      console.log(`Message ${messageId} already processed, skipping duplicate`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Received message from ${senderId}: ${messageText.substring(0, 100)}`);

    // Найти или создать пользователя
    const user = await userService.findOrCreateUser(senderId);
    console.log(`User found/created: ${user.id}`);

    // Найти или создать активную беседу
    const conversationId = await conversationService.findOrCreateActiveConversation(
      user.id
    );
    console.log(`Conversation ID: ${conversationId}`);

    // Сохранить сообщение пользователя (вернет false если уже существует)
    const messageSaved = await conversationService.saveMessage(
      conversationId,
      messageId,
      MessageRole.USER,
      messageText
    );

    if (!messageSaved) {
      console.log(`Message ${messageId} was duplicate, stopping processing`);
      return;
    }

    // Получить контекст беседы (включая только что сохраненное сообщение)
    const context = await conversationService.getConversationContext(conversationId);

    if (!context) {
      console.error('Failed to get conversation context');
      await instagramService.sendMessage(
        senderId,
        "I'm sorry, I'm having trouble accessing our conversation history. Could you please try again?"
      );
      return;
    }

    // Генерировать ответ через LLM
    console.log('Generating LLM response...');
    const response = await llmService.generateResponse(
      messageText,
      context
    );
    console.log(`Generated response: ${response.substring(0, 100)}...`);

    // Отправить ответ пользователю
    await instagramService.sendMessage(senderId, response);

    // Сохранить ответ ассистента
    const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await conversationService.saveMessage(
      conversationId,
      assistantMessageId,
      MessageRole.ASSISTANT,
      response
    );

    // Проверить, нужно ли создать запись на консультацию
    // Используем тот же контекст, но обновленный после сохранения ответа
    console.log('Checking for appointment data...');
    // Получаем обновленный контекст с только что сохраненным ответом
    const updatedContext = await conversationService.getConversationContext(conversationId);
    
    if (updatedContext) {
      const appointmentData = await llmService.extractAppointmentData(
        messageText,
        response,
        updatedContext
      );

      if (appointmentData && appointmentData.patientName && appointmentData.phone) {
        console.log(`Appointment data extracted: ${appointmentData.patientName}, ${appointmentData.phone}`);
        
        try {
          // Создать запись
          const appointment = await appointmentService.createAppointment({
            userId: user.id,
            conversationId,
            patientName: appointmentData.patientName,
            phone: appointmentData.phone,
            serviceType: appointmentData.serviceType,
            preferredTime: appointmentData.preferredTime,
            notes: appointmentData.notes,
          });

          console.log(`Appointment created: ${appointment.id}`);

          // Отправить дополнительное подтверждение
          const confirmationMessage = "\n\nPerfect! I've saved your appointment details. Our team will contact you shortly to confirm the time.";
          await instagramService.sendMessage(senderId, confirmationMessage);

          // Сохранить подтверждение
          await conversationService.saveMessage(
            conversationId,
            `assistant-confirm-${Date.now()}`,
            MessageRole.ASSISTANT,
            confirmationMessage
          );
        } catch (appointmentError: any) {
          console.error('Error creating appointment:', appointmentError);
          // Не отправляем ошибку пользователю, т.к. основной ответ уже отправлен
        }
      } else {
        console.log('Not enough data for appointment yet');
      }
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error handling message:`, error);
    console.error('Error stack:', error.stack);
    
    // Отправить сообщение об ошибке пользователю только если у нас есть senderId
    if (senderId) {
      try {
        await instagramService.sendMessage(
          senderId,
          "I'm sorry, I'm having some technical difficulties right now. Please try again in a moment, or feel free to reach out directly."
        );
      } catch (sendError: any) {
        console.error('Error sending error message:', sendError);
      }
    }
  }
}

export default router;

