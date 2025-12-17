import axios from 'axios';
import { InstagramSendMessagePayload } from '../types';

export class InstagramService {
  private pageAccessToken: string;
  private apiVersion = 'v18.0';
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  constructor() {
    const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
    if (!token) {
      throw new Error('INSTAGRAM_PAGE_ACCESS_TOKEN is not set');
    }
    this.pageAccessToken = token;
  }

  /**
   * Отправить текстовое сообщение пользователю
   * Instagram имеет лимит 1000 символов на сообщение
   */
  async sendMessage(recipientId: string, messageText: string): Promise<void> {
    try {
      // Instagram лимит: 1000 символов на сообщение
      const MAX_MESSAGE_LENGTH = 1000;
      const textToSend = messageText.length > MAX_MESSAGE_LENGTH 
        ? messageText.substring(0, MAX_MESSAGE_LENGTH - 3) + '...'
        : messageText;

      const payload: InstagramSendMessagePayload = {
        recipient: {
          id: recipientId,
        },
        message: {
          text: textToSend,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        {
          params: {
            access_token: this.pageAccessToken,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(`Instagram API error: ${JSON.stringify(response.data.error)}`);
      }

      console.log(`Message sent to ${recipientId}: ${textToSend.substring(0, 50)}...`);
    } catch (error: any) {
      console.error('Error sending Instagram message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(userId: string): Promise<{ username?: string; name?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/${userId}`, {
        params: {
          access_token: this.pageAccessToken,
          fields: 'username,name',
        },
      });

      return {
        username: response.data.username,
        name: response.data.name,
      };
    } catch (error: any) {
      console.error('Error getting user info:', error.response?.data || error.message);
      return {};
    }
  }
}

