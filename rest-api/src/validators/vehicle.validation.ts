import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  brand: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Marka en az 2 karakter olmalıdır',
    'string.max': 'Marka en fazla 50 karakter olmalıdır',
    'any.required': 'Marka zorunludur'
  }),
  modelName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Model en az 2 karakter olmalıdır',
    'string.max': 'Model en fazla 50 karakter olmalıdır',
    'any.required': 'Model zorunludur'
  }),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required().messages({
    'number.base': 'Yıl sayı olmalıdır',
    'number.integer': 'Yıl tam sayı olmalıdır',
    'number.min': 'Yıl 1900\'den büyük olmalıdır',
    'number.max': 'Yıl gelecek yıldan büyük olamaz',
    'any.required': 'Yıl zorunludur'
  }),
  plateNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/).required().messages({
    'string.pattern.base': 'Geçerli bir plaka formatı giriniz (örn: 34ABC123)',
    'any.required': 'Plaka numarası zorunludur'
  }),
  fuelType: Joi.string().valid('Benzin', 'Dizel', 'Elektrik', 'Benzin/Tüp', 'Hibrit', 'Hybrid').required().messages({
    'any.only': 'Yakıt tipi geçerli değil',
    'any.required': 'Yakıt tipi zorunludur'
  }),
  engineType: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Motor tipi en az 2 karakter olmalıdır',
    'string.max': 'Motor tipi en fazla 50 karakter olmalıdır',
    'any.required': 'Motor tipi zorunludur'
  }),
  transmission: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Vites tipi en az 2 karakter olmalıdır',
    'string.max': 'Vites tipi en fazla 50 karakter olmalıdır',
    'any.required': 'Vites tipi zorunludur'
  }),
  package: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Paket en az 2 karakter olmalıdır',
    'string.max': 'Paket en fazla 100 karakter olmalıdır',
    'any.required': 'Paket zorunludur'
  })
});
