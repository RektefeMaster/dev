import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'Kullanıcı ID\'si gereklidir',
    'any.required': 'Kullanıcı ID\'si gereklidir'
  }),
  mechanicId: Joi.string().required().messages({
    'string.empty': 'Usta ID\'si gereklidir',
    'any.required': 'Usta ID\'si gereklidir'
  }),
  serviceType: Joi.string().required().messages({
    'string.empty': 'Hizmet tipi gereklidir',
    'any.required': 'Hizmet tipi gereklidir'
  }),
  appointmentDate: Joi.date().iso().required().messages({
    'date.base': 'Geçerli bir tarih giriniz',
    'date.format': 'Tarih ISO formatında olmalıdır',
    'any.required': 'Randevu tarihi gereklidir'
  }),
  timeSlot: Joi.string().required().messages({
    'string.empty': 'Randevu saati gereklidir',
    'any.required': 'Randevu saati gereklidir'
  }),
  description: Joi.string().min(10).max(500).optional().messages({
    'string.min': 'Açıklama en az 10 karakter olmalıdır',
    'string.max': 'Açıklama en fazla 500 karakter olmalıdır'
  }),
  vehicleId: Joi.string().optional().messages({
    'string.empty': 'Geçerli bir araç ID\'si giriniz'
  })
});

export const updateAppointmentSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'rejected', 'in-progress', 'completed', 'cancelled').required().messages({
    'string.empty': 'Durum gereklidir',
    'any.only': 'Geçerli bir durum seçiniz',
    'any.required': 'Durum gereklidir'
  }),
  rejectionReason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().min(10).max(200).required().messages({
      'string.empty': 'Red gerekçesi gereklidir',
      'string.min': 'Red gerekçesi en az 10 karakter olmalıdır',
      'string.max': 'Red gerekçesi en fazla 200 karakter olmalıdır',
      'any.required': 'Red gerekçesi gereklidir'
    }),
    otherwise: Joi.string().optional()
  }),
  mechanicNotes: Joi.string().max(500).optional().messages({
    'string.max': 'Usta notları en fazla 500 karakter olmalıdır'
  })
});
