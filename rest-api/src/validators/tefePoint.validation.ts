import Joi from 'joi';

export const earnPointsSchema = Joi.object({
  serviceCategory: Joi.string().required().messages({
    'string.empty': 'Hizmet kategorisi gereklidir',
    'any.required': 'Hizmet kategorisi gereklidir'
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Miktar pozitif olmalıdır',
    'any.required': 'Miktar gereklidir'
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Açıklama gereklidir',
    'any.required': 'Açıklama gereklidir'
  })
});

export const usePointsSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Miktar pozitif olmalıdır',
    'any.required': 'Miktar gereklidir'
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Açıklama gereklidir',
    'any.required': 'Açıklama gereklidir'
  })
});

export const getHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.integer': 'Limit tam sayı olmalıdır',
    'number.min': 'Limit en az 1 olmalıdır',
    'number.max': 'Limit en fazla 100 olmalıdır'
  }),
  page: Joi.number().integer().min(1).optional().messages({
    'number.integer': 'Sayfa tam sayı olmalıdır',
    'number.min': 'Sayfa en az 1 olmalıdır'
  }),
  type: Joi.string().optional().messages({
    'string.empty': 'Tip boş olamaz'
  })
});

export const getStatsSchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'year').optional().messages({
    'any.only': 'Dönem hafta, ay veya yıl olmalıdır'
  })
});
