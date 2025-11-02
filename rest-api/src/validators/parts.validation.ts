import Joi from 'joi';

// Parts Inventory Validation
export const createPartSchema = Joi.object({
  partName: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Parça adı en az 2 karakter olmalıdır',
    'string.max': 'Parça adı en fazla 200 karakter olmalıdır',
    'any.required': 'Parça adı zorunludur'
  }),
  brand: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Marka en az 2 karakter olmalıdır',
    'string.max': 'Marka en fazla 100 karakter olmalıdır',
    'any.required': 'Marka zorunludur'
  }),
  partNumber: Joi.string().max(100).allow('').optional(),
  description: Joi.string().max(2000).allow('').optional(),
  photos: Joi.array().items(Joi.string().uri()).max(10).optional().default([]),
  category: Joi.string().valid(
    'engine', 'electrical', 'suspension', 'brake', 'body', 
    'interior', 'exterior', 'fuel', 'cooling', 'transmission', 
    'exhaust', 'other'
  ).required().messages({
    'any.only': 'Geçersiz kategori',
    'any.required': 'Kategori zorunludur'
  }),
  compatibility: Joi.object({
    makeModel: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': 'En az bir araç marka/model seçmelisiniz',
      'any.required': 'Uyumluluk bilgisi zorunludur'
    }),
    years: Joi.object({
      start: Joi.number().integer().min(1900).max(2100).required(),
      end: Joi.number().integer().min(1900).max(2100).required()
    }).required(),
    engine: Joi.array().items(Joi.string()).optional(),
    vinPrefix: Joi.array().items(Joi.string().length(3)).optional(),
    notes: Joi.string().max(500).optional()
  }).required(),
  stock: Joi.object({
    quantity: Joi.number().integer().min(0).required(),
    lowThreshold: Joi.number().integer().min(0).default(5)
  }).required(),
  pricing: Joi.object({
    unitPrice: Joi.number().min(0).required(),
    oldPrice: Joi.number().min(0).optional(),
    currency: Joi.string().valid('TRY', 'USD', 'EUR').default('TRY'),
    isNegotiable: Joi.boolean().default(false)
  }).required(),
  condition: Joi.string().valid('new', 'used', 'refurbished', 'oem', 'aftermarket').required(),
  warranty: Joi.object({
    months: Joi.number().integer().min(0).max(120),
    description: Joi.string().max(500)
  }).optional(),
  isPublished: Joi.boolean().default(false)
});

export const updatePartSchema = createPartSchema.fork(
  ['partName', 'brand', 'category', 'compatibility', 'stock', 'pricing', 'condition'],
  (schema) => schema.optional()
);

export const searchPartsSchema = Joi.object({
  query: Joi.string().optional(),
  category: Joi.string().valid(
    'engine', 'electrical', 'suspension', 'brake', 'body',
    'interior', 'exterior', 'fuel', 'cooling', 'transmission',
    'exhaust', 'other'
  ).optional(),
  makeModel: Joi.string().optional(),
  year: Joi.number().integer().min(1900).max(2100).optional(),
  vin: Joi.string().length(17).pattern(/^[A-HJ-NPR-Z0-9]{17}$/).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  condition: Joi.string().valid('new', 'used', 'refurbished', 'oem', 'aftermarket').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Parts Reservation Validation
export const createReservationSchema = Joi.object({
  partId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Geçersiz parça ID',
    'any.required': 'Parça ID zorunludur'
  }),
  vehicleId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'En az 1 adet seçmelisiniz',
    'any.required': 'Miktar zorunludur'
  }),
  delivery: Joi.object({
    method: Joi.string().valid('pickup', 'standard', 'express').required(),
    address: Joi.string().optional()
  }).required(),
  payment: Joi.object({
    method: Joi.string().valid('cash', 'card', 'transfer').required()
  }).required()
});

export const updateReservationSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'cancelled', 'delivered', 'completed').optional(),
  cancellationReason: Joi.string().max(500).optional(),
  cancelledBy: Joi.string().valid('buyer', 'seller', 'system').optional()
});

export const negotiatePriceSchema = Joi.object({
  requestedPrice: Joi.number().min(0).required(),
  message: Joi.string().max(500).allow('').optional()
});

export const counterOfferSchema = Joi.object({
  offeredPrice: Joi.number().min(0).required(),
  message: Joi.string().max(500).allow('').optional()
});

