import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  vehicleId: Joi.string().required().messages({
    'any.required': 'Araç ID\'si zorunludur'
  }),
  serviceType: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Servis tipi en az 2 karakter olmalıdır',
    'string.max': 'Servis tipi en fazla 100 karakter olmalıdır',
    'any.required': 'Servis tipi zorunludur'
  }),
  preferredDate: Joi.date().min('now').required().messages({
    'date.base': 'Geçerli bir tarih giriniz',
    'date.min': 'Tarih bugünden sonra olmalıdır',
    'any.required': 'Tercih edilen tarih zorunludur'
  }),
  preferredTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Geçerli bir saat formatı giriniz (HH:MM)'
  }),
  description: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Açıklama en az 10 karakter olmalıdır',
    'string.max': 'Açıklama en fazla 500 karakter olmalıdır',
    'any.required': 'Açıklama zorunludur'
  }),
  urgency: Joi.string().valid('low', 'medium', 'high', 'emergency').default('medium').messages({
    'any.only': 'Aciliyet seviyesi low, medium, high veya emergency olmalıdır'
  })
});
