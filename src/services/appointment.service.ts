import { AppointmentStatus, ConversationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AppointmentData {
  userId: string;
  conversationId: string;
  patientName: string;
  phone: string;
  serviceType?: string;
  preferredTime?: string;
  notes?: string;
}

export class AppointmentService {
  /**
   * Создать запись на консультацию
   */
  async createAppointment(data: AppointmentData) {
    const appointment = await prisma.appointment.create({
      data: {
        userId: data.userId,
        conversationId: data.conversationId,
        patientName: data.patientName,
        phone: data.phone,
        serviceType: data.serviceType,
        preferredTime: data.preferredTime,
        notes: data.notes,
        status: AppointmentStatus.PENDING,
      },
    });

    // Обновить статус беседы
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { status: ConversationStatus.APPOINTMENT_BOOKED },
    });

    // Обновить телефон пользователя, если его еще нет (оптимизированный запрос)
    if (data.phone) {
      await prisma.user.updateMany({
        where: {
          id: data.userId,
          phone: null,
        },
        data: { phone: data.phone },
      });
    }

    return appointment;
  }

  /**
   * Получить все записи пользователя
   */
  async getUserAppointments(userId: string) {
    return prisma.appointment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получить запись по ID
   */
  async getAppointmentById(appointmentId: string) {
    return prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        conversation: true,
      },
    });
  }

  /**
   * Обновить статус записи
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ) {
    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }
}

