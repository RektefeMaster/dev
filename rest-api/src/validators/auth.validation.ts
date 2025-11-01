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
  serviceCategories: Joi.array().items(Joi.string().valid('towing', 'repair', 'wash', 'tire', 'bodywork', 'electrical', 'parts')).optional(),
  location: Joi.object({
    address: Joi.string().optional(),
    city: Joi.string().optional()
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
