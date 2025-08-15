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
  userType: Joi.string().valid('driver', 'mechanic').default('driver').messages({
    'any.only': 'Kullanıcı tipi driver veya mechanic olmalıdır'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir e-posta adresi giriniz',
    'any.required': 'E-posta zorunludur'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Şifre zorunludur'
  }),
  userType: Joi.string().valid('driver', 'mechanic').optional()
});
