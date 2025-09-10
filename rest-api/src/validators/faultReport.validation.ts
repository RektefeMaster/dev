import Joi from 'joi';

export const validateFaultReport = (data: any) => {
  const schema = Joi.object({
    vehicleId: Joi.string().required().messages({
      'any.required': 'Araç seçimi zorunludur',
      'string.empty': 'Araç seçimi zorunludur'
    }),
    serviceCategory: Joi.string().valid(
      'Ağır Bakım',
      'Üst Takım', 
      'Alt Takım',
      'Kaporta/Boya',
      'Elektrik-Elektronik',
      'Yedek Parça',
      'Lastik',
      'Egzoz & Emisyon',
      'Ekspertiz',
      'Sigorta & Kasko',
      'Araç Yıkama',
      'Genel Bakım'
    ).required().messages({
      'any.required': 'Hizmet kategorisi seçimi zorunludur',
      'any.only': 'Geçersiz hizmet kategorisi'
    }),
    faultDescription: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'any.required': 'Arıza açıklaması zorunludur',
        'string.min': 'Arıza açıklaması en az 10 karakter olmalıdır',
        'string.max': 'Arıza açıklaması en fazla 1000 karakter olabilir',
        'string.empty': 'Arıza açıklaması zorunludur'
      }),
    photos: Joi.array()
      .items(Joi.string().uri())
      .max(3)
      .messages({
        'array.max': 'En fazla 3 fotoğraf yükleyebilirsiniz',
        'string.uri': 'Geçersiz fotoğraf URL\'i'
      }),
    videos: Joi.array()
      .items(Joi.string().uri())
      .max(1)
      .messages({
        'array.max': 'En fazla 1 video yükleyebilirsiniz',
        'string.uri': 'Geçersiz video URL\'i'
      }),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .default('medium')
      .messages({
        'any.only': 'Geçersiz öncelik seviyesi'
      }),
    location: Joi.object({
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .messages({
          'array.length': 'Koordinatlar [longitude, latitude] formatında olmalıdır',
          'array.items': 'Koordinatlar sayı olmalıdır'
        }),
      address: Joi.string().max(200),
      city: Joi.string().max(50),
      district: Joi.string().max(50),
      neighborhood: Joi.string().max(50)
    }).optional()
  });

  return schema.validate(data);
};

export const validateQuote = (data: any) => {
  const schema = Joi.object({
    faultReportId: Joi.string().required().messages({
      'any.required': 'Arıza bildirimi ID\'si zorunludur',
      'string.empty': 'Arıza bildirimi ID\'si zorunludur'
    }),
    quoteAmount: Joi.number()
      .min(0)
      .max(1000000)
      .required()
      .messages({
        'any.required': 'Fiyat teklifi zorunludur',
        'number.min': 'Fiyat 0\'dan küçük olamaz',
        'number.max': 'Fiyat çok yüksek',
        'number.base': 'Fiyat sayı olmalıdır'
      }),
    estimatedDuration: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'any.required': 'Tahmini süre zorunludur',
        'string.min': 'Tahmini süre en az 1 karakter olmalıdır',
        'string.max': 'Tahmini süre en fazla 100 karakter olabilir',
        'string.empty': 'Tahmini süre zorunludur'
      }),
    notes: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Notlar en fazla 500 karakter olabilir'
      })
  });

  return schema.validate(data);
};

export const validateSelectQuote = (data: any) => {
  const schema = Joi.object({
    faultReportId: Joi.string().required().messages({
      'any.required': 'Arıza bildirimi ID\'si zorunludur',
      'string.empty': 'Arıza bildirimi ID\'si zorunludur'
    }),
    quoteIndex: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'any.required': 'Teklif indeksi zorunludur',
        'number.integer': 'Teklif indeksi tam sayı olmalıdır',
        'number.min': 'Teklif indeksi 0\'dan küçük olamaz',
        'number.base': 'Teklif indeksi sayı olmalıdır'
      })
  });

  return schema.validate(data);
};

export const validateMechanicResponse = (data: any) => {
  const schema = Joi.object({
    responseType: Joi.string()
      .valid('quote', 'not_available', 'check_tomorrow', 'contact_me')
      .required()
      .messages({
        'any.required': 'Yanıt türü zorunludur',
        'any.only': 'Geçersiz yanıt türü'
      }),
    message: Joi.string()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Mesaj en fazla 500 karakter olabilir'
      }),
    // Teklif veriyorsa bu alanlar gerekli
    quoteAmount: Joi.when('responseType', {
      is: 'quote',
      then: Joi.number()
        .min(0)
        .max(1000000)
        .required()
        .messages({
          'any.required': 'Fiyat teklifi zorunludur',
          'number.min': 'Fiyat 0\'dan küçük olamaz',
          'number.max': 'Fiyat çok yüksek',
          'number.base': 'Fiyat sayı olmalıdır'
        }),
      otherwise: Joi.optional()
    }),
    estimatedDuration: Joi.when('responseType', {
      is: 'quote',
      then: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
          'any.required': 'Tahmini süre zorunludur',
          'string.min': 'Tahmini süre en az 1 karakter olmalıdır',
          'string.max': 'Tahmini süre en fazla 100 karakter olabilir',
          'string.empty': 'Tahmini süre zorunludur'
        }),
      otherwise: Joi.optional()
    })
  });

  return schema.validate(data);
};

export const validateTomorrowResponse = (data: any) => {
  const schema = Joi.object({
    action: Joi.string()
      .valid('accept', 'reject')
      .required()
      .messages({
        'any.required': 'Aksiyon zorunludur',
        'any.only': 'Aksiyon "accept" veya "reject" olmalıdır'
      })
  });

  return schema.validate(data);
};

export const validateContact = (data: any) => {
  const schema = Joi.object({
    message: Joi.string()
      .min(1)
      .max(500)
      .required()
      .messages({
        'any.required': 'Mesaj zorunludur',
        'string.min': 'Mesaj en az 1 karakter olmalıdır',
        'string.max': 'Mesaj en fazla 500 karakter olabilir',
        'string.empty': 'Mesaj zorunludur'
      })
  });

  return schema.validate(data);
};
