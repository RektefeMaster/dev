import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  vehicleId: Joi.string().required().messages({
    'any.required': 'Araç ID\'si zorunludur'
  }),
  mechanicId: Joi.string().optional().messages({
    'string.base': 'Mekanik ID\'si string olmalıdır'
  }),
  serviceType: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Servis tipi en az 2 karakter olmalıdır',
    'string.max': 'Servis tipi en fazla 100 karakter olmalıdır',
    'any.required': 'Servis tipi zorunludur'
  }),
  appointmentDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Geçerli bir ISO tarih formatı giriniz',
    'any.required': 'Randevu tarihi zorunludur'
  }),
  timeSlot: Joi.string().optional().messages({
    'string.base': 'Saat dilimi string olmalıdır'
  }),
  notes: Joi.string().max(500).allow('').optional().messages({
    'string.max': 'Notlar en fazla 500 karakter olmalıdır'
  }),
  sharePhoneNumber: Joi.boolean().optional().messages({
    'boolean.base': 'Telefon paylaşımı boolean olmalıdır'
  }),
  estimatedDuration: Joi.number().min(30).max(480).optional().messages({
    'number.base': 'Tahmini süre sayı olmalıdır',
    'number.min': 'Tahmini süre en az 30 dakika olmalıdır',
    'number.max': 'Tahmini süre en fazla 8 saat olmalıdır'
  }),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium').messages({
    'any.only': 'Öncelik seviyesi low, medium, high veya urgent olmalıdır'
  })
});

export const updateMechanicProfileSchema = Joi.object({
  shopName: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Dükkan adı en az 2 karakter olmalıdır',
    'string.max': 'Dükkan adı en fazla 100 karakter olmalıdır'
  }),
  city: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Şehir en az 2 karakter olmalıdır',
    'string.max': 'Şehir en fazla 50 karakter olmalıdır'
  }),
  experience: Joi.number().min(0).max(50).optional().messages({
    'number.base': 'Deneyim yılı sayı olmalıdır',
    'number.min': 'Deneyim yılı negatif olamaz',
    'number.max': 'Deneyim yılı 50\'den büyük olamaz'
  }),
  vehicleBrands: Joi.array().items(Joi.string().min(2).max(50)).min(1).optional().messages({
    'array.min': 'En az bir araç markası seçilmelidir',
    'array.base': 'Araç markaları array olmalıdır'
  }),
  serviceCategories: Joi.array().items(Joi.string().min(2).max(100)).min(1).optional().messages({
    'array.min': 'En az bir uzmanlık alanı seçilmelidir',
    'array.base': 'Uzmanlık alanları array olmalıdır'
  }),
  isAvailable: Joi.boolean().optional().messages({
    'boolean.base': 'Müsaitlik durumu boolean olmalıdır'
  }),
  phone: Joi.string().min(10).max(15).optional().messages({
    'string.min': 'Telefon numarası en az 10 karakter olmalıdır',
    'string.max': 'Telefon numarası en fazla 15 karakter olmalıdır'
  })
});
