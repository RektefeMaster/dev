import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'İsim en az 2 karakter olmalıdır',
    'string.max': 'İsim en fazla 50 karakter olmalıdır',
    'any.required': 'İsim zorunludur'
  }),
  surname: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Soyisim en az 2 karakter olmalıdır',
    'string.max': 'Soyisim en fazla 50 karakter olmalıdır',
    'any.required': 'Soyisim zorunludur'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir e-posta adresi giriniz',
    'any.required': 'E-posta zorunludur'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Şifre en az 6 karakter olmalıdır',
    'any.required': 'Şifre zorunludur'
  }),
  userType: Joi.string().valid('driver', 'mechanic').optional().default('driver').messages({
    'any.only': 'Kullanıcı tipi driver veya mechanic olmalıdır'
  }),
  // Mechanic için opsiyonel alanlar
  username: Joi.string().min(3).max(30).optional(),
  phone: Joi.string().optional(),
  experience: Joi.number().min(0).optional(),
  specialties: Joi.array().items(Joi.string()).optional(),
  serviceCategories: Joi.array()
    .items(Joi.string().valid('towing', 'repair', 'wash', 'tire', 'bodywork', 'electrical', 'parts'))
    .when('userType', {
      is: 'mechanic',
      then: Joi.array().min(1).required().messages({
        'any.required': 'En az bir hizmet kategorisi seçmelisiniz',
        'array.min': 'En az bir hizmet kategorisi seçmelisiniz'
      }),
      otherwise: Joi.array().optional()
    })
    .messages({
      'array.base': 'Hizmet kategorileri dizi formatında olmalıdır',
      'any.only': 'Geçersiz hizmet kategorisi'
    }),
  location: Joi.object({
    city: Joi.string().optional().allow(''),
    district: Joi.string().optional().allow(''),
    neighborhood: Joi.string().optional().allow(''),
    street: Joi.string().optional().allow(''),
    building: Joi.string().optional().allow(''),
    floor: Joi.string().optional().allow(''),
    apartment: Joi.string().optional().allow(''),
    coordinates: Joi.object({
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional()
    }).optional()
  }).optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir e-posta adresi giriniz',
    'any.required': 'E-posta zorunludur'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Şifre zorunludur'
  }),
  userType: Joi.string().valid('driver', 'mechanic').required().messages({
    'any.required': 'Kullanıcı tipi zorunludur',
    'any.only': 'Kullanıcı tipi driver veya mechanic olmalıdır'
  })
});
