import { prisma } from '../lib/prisma';

export class UserService {
  /**
   * Найти или создать пользователя по Instagram ID
   */
  async findOrCreateUser(
    instagramUserId: string,
    username?: string,
    fullName?: string
  ) {
    let user = await prisma.user.findUnique({
      where: { instagramUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          instagramUserId,
          username,
          fullName,
        },
      });
    } else {
      // Обновить данные, если они изменились
      if (username || fullName) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            username: username || user.username,
            fullName: fullName || user.fullName,
          },
        });
      }
    }

    return user;
  }

  /**
   * Обновить телефон пользователя
   */
  async updateUserPhone(userId: string, phone: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { phone },
    });
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
}

