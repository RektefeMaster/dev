import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  brand: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Marka en az 2 karakter olmalıdır',
    'string.max': 'Marka en fazla 50 karakter olmalıdır',
    'any.required': 'Marka zorunludur'
  }),
  model: Joi.string().min(2).max(50).required().messages({
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
  plate: Joi.string().pattern(/^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/).optional().messages({
    'string.pattern.base': 'Geçerli bir plaka formatı giriniz (örn: 34ABC123)'
  }),
  color: Joi.string().min(2).max(30).optional().messages({
    'string.min': 'Renk en az 2 karakter olmalıdır',
    'string.max': 'Renk en fazla 30 karakter olmalıdır'
  }),
  fuelType: Joi.string().valid('benzin', 'dizel', 'elektrik', 'hibrit').optional().messages({
    'any.only': 'Yakıt tipi benzin, dizel, elektrik veya hibrit olmalıdır'
  }),
  engineSize: Joi.number().min(500).max(10000).optional().messages({
    'number.base': 'Motor hacmi sayı olmalıdır',
    'number.min': 'Motor hacmi en az 500 cc olmalıdır',
    'number.max': 'Motor hacmi en fazla 10000 cc olmalıdır'
  }),
  mileage: Joi.number().min(0).max(1000000).optional().messages({
    'number.base': 'Kilometre sayı olmalıdır',
    'number.min': 'Kilometre negatif olamaz',
    'number.max': 'Kilometre 1 milyondan büyük olamaz'
  })
});
