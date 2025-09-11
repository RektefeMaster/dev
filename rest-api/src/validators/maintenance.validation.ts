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
  // Hizmet alanları
  serviceCategories: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Hizmet alanları dizi formatında olmalıdır',
    'string.base': 'Hizmet alanı metin formatında olmalıdır'
  }),
  
  // Araç markaları
  carBrands: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Araç markaları dizi formatında olmalıdır',
    'string.base': 'Araç markası metin formatında olmalıdır'
  }),
  
  // Motor türleri
  engineTypes: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Motor türleri dizi formatında olmalıdır',
    'string.base': 'Motor türü metin formatında olmalıdır'
  }),
  
  // Vites türleri
  transmissionTypes: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Vites türleri dizi formatında olmalıdır',
    'string.base': 'Vites türü metin formatında olmalıdır'
  }),
  
  // Özel markalar
  customBrands: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Özel markalar dizi formatında olmalıdır',
    'string.base': 'Özel marka metin formatında olmalıdır'
  }),
  
  // Çalışma saatleri
  workingHours: Joi.string().optional().messages({
    'string.base': 'Çalışma saatleri metin formatında olmalıdır'
  }),
  isAvailable: Joi.boolean().optional().messages({
    'boolean.base': 'Müsaitlik durumu boolean olmalıdır'
  }),
  phone: Joi.string().min(10).max(15).optional().messages({
    'string.min': 'Telefon numarası en az 10 karakter olmalıdır',
    'string.max': 'Telefon numarası en fazla 15 karakter olmalıdır'
  }),
  // Gizlilik ayarları
  phoneHidden: Joi.boolean().optional().messages({
    'boolean.base': 'Telefon gizlilik ayarı boolean olmalıdır'
  }),
  emailHidden: Joi.boolean().optional().messages({
    'boolean.base': 'E-posta gizlilik ayarı boolean olmalıdır'
  }),
  cityHidden: Joi.boolean().optional().messages({
    'boolean.base': 'Şehir gizlilik ayarı boolean olmalıdır'
  }),
  // Diğer profil alanları
  name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Ad en az 2 karakter olmalıdır',
    'string.max': 'Ad en fazla 50 karakter olmalıdır'
  }),
  surname: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Soyad en az 2 karakter olmalıdır',
    'string.max': 'Soyad en fazla 50 karakter olmalıdır'
  }),
  bio: Joi.string().max(500).optional().messages({
    'string.max': 'Biyografi en fazla 500 karakter olmalıdır'
  }),
  specialties: Joi.array().items(Joi.string().min(2).max(100)).min(1).optional().messages({
    'array.min': 'En az bir uzmanlık alanı seçilmelidir',
    'array.base': 'Uzmanlık alanları array olmalıdır'
  }),
  location: Joi.object({
    city: Joi.string().min(2).max(50).allow('').optional(),
    district: Joi.string().min(2).max(50).allow('').optional(),
    neighborhood: Joi.string().min(2).max(50).allow('').optional(),
    street: Joi.string().min(2).max(100).allow('').optional(),
    building: Joi.string().min(1).max(50).allow('').optional(),
    floor: Joi.string().min(1).max(10).allow('').optional(),
    apartment: Joi.string().min(1).max(10).allow('').optional(),
    description: Joi.string().max(500).allow('').optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).optional()
  }).optional()
});
