/**
 * Валидация данных записи
 */

export function isValidPhone(phone: string): boolean {
  // Простая валидация: должен содержать цифры и быть не слишком коротким
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
}

export function isValidName(name: string): boolean {
  // Имя должно быть не пустым и содержать хотя бы одну букву
  return name.trim().length >= 2 && /[a-zA-Z]/.test(name);
}

export function validateAppointmentData(data: {
  patientName?: string;
  phone?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.patientName || !isValidName(data.patientName)) {
    errors.push('Valid patient name is required');
  }

  if (!data.phone || !isValidPhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

