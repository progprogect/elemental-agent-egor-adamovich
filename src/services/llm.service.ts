import OpenAI from 'openai';
import { ConversationContext } from '../types';
import { buildPrompt, buildAppointmentExtractionPrompt } from '../utils/prompt-builder';

export interface AppointmentData {
  patientName?: string;
  phone?: string;
  preferredTime?: string;
  serviceType?: string;
  notes?: string;
}

export class LLMService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Генерировать ответ на сообщение пользователя
   */
  async generateResponse(
    currentMessage: string,
    context: ConversationContext
  ): Promise<string> {
    try {
      const messages = buildPrompt(currentMessage, context);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.8, // Для более естественных ответов
        max_tokens: 500, // Ограничение длины ответа
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('Empty response from OpenAI');
      }

      return response.trim();
    } catch (error: any) {
      console.error('Error generating LLM response:', error);
      
      // Fallback ответ при ошибке
      return "I'm sorry, I'm having trouble processing that right now. Could you please rephrase your question?";
    }
  }

  /**
   * Извлечь данные записи из диалога
   */
  async extractAppointmentData(
    currentMessage: string,
    lastAssistantResponse: string,
    context: ConversationContext
  ): Promise<AppointmentData | null> {
    try {
      // Построить историю беседы в текстовом формате
      const conversationHistory = context.messages
        .map((msg) => {
          const role = msg.role === 'USER' ? 'Patient' : 'Doctor';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');

      const extractionPrompt = buildAppointmentExtractionPrompt(
        conversationHistory,
        lastAssistantResponse
      );

      // response_format поддерживается только в некоторых моделях (gpt-4-turbo, gpt-3.5-turbo-1106+)
      // Делаем условно, чтобы не ломать работу с другими моделями
      const requestOptions: any = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract appointment information from conversations and respond ONLY with valid JSON. Do not include any explanations or text outside the JSON object.',
          },
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
        temperature: 0.2, // Низкая температура для более точного извлечения
        max_tokens: 300,
      };

      // Добавляем response_format только для поддерживающих моделей
      if (this.model.includes('gpt-4') || this.model.includes('gpt-3.5-turbo-1106') || this.model.includes('gpt-3.5-turbo-0125')) {
        requestOptions.response_format = { type: 'json_object' };
      }

      const completion = await this.openai.chat.completions.create(requestOptions);

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        console.log('Empty response from extraction');
        return null;
      }

      // Попытаться распарсить JSON из ответа
      let jsonMatch = response.trim();
      
      // Если ответ не начинается с {, попробовать найти JSON внутри
      if (!jsonMatch.startsWith('{')) {
        const match = jsonMatch.match(/\{[\s\S]*\}/);
        if (match) {
          jsonMatch = match[0];
        } else {
          console.log('No JSON found in response');
          return null;
        }
      }

      const data = JSON.parse(jsonMatch);

      // Проверить, есть ли достаточно данных для записи
      if (
        data.wantsAppointment === true &&
        data.hasEnoughInfo === true &&
        data.patientName &&
        data.phone &&
        data.patientName !== 'null' &&
        data.phone !== 'null'
      ) {
        return {
          patientName: String(data.patientName).trim(),
          phone: String(data.phone).trim(),
          preferredTime: data.preferredTime && data.preferredTime !== 'null' ? String(data.preferredTime).trim() : undefined,
          serviceType: data.serviceType && data.serviceType !== 'null' ? String(data.serviceType).trim() : undefined,
          notes: data.notes && data.notes !== 'null' ? String(data.notes).trim() : undefined,
        };
      }

      console.log('Not enough data extracted:', data);
      return null;
    } catch (error: any) {
      console.error('Error extracting appointment data:', error.message);
      return null;
    }
  }
}

