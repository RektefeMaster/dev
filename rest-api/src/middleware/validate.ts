import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errorMessage
      });
    }
    
    next();
  };
};

// Auth validation schemas
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

// Vehicle validation schemas
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

// Maintenance appointment validation schemas
export const createAppointmentSchema = Joi.object({
  vehicleId: Joi.string().required().messages({
    'any.required': 'Araç ID\'si zorunludur'
  }),
  serviceType: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Servis tipi en az 2 karakter olmalıdır',
    'string.max': 'Servis tipi en fazla 100 karakter olmalıdır',
    'any.required': 'Servis tipi zorunludur'
  }),
  preferredDate: Joi.date().min('now').required().messages({
    'date.base': 'Geçerli bir tarih giriniz',
    'date.min': 'Tarih bugünden sonra olmalıdır',
    'any.required': 'Tercih edilen tarih zorunludur'
  }),
  preferredTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Geçerli bir saat formatı giriniz (HH:MM)'
  }),
  description: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Açıklama en az 10 karakter olmalıdır',
    'string.max': 'Açıklama en fazla 500 karakter olmalıdır',
    'any.required': 'Açıklama zorunludur'
  }),
  urgency: Joi.string().valid('low', 'medium', 'high', 'emergency').default('medium').messages({
    'any.only': 'Aciliyet seviyesi low, medium, high veya emergency olmalıdır'
  })
});

// Mechanic profile update validation schema
export const updateMechanicProfileSchema = Joi.object({
  shopName: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Dükkan adı en az 2 karakter olmalıdır',
    'string.max': 'Dükkan adı en fazla 100 karakter olmalıdır'
  }),
  phone: Joi.string().pattern(/^(\+90|0)?[0-9]{10}$/).optional().messages({
    'string.pattern.base': 'Geçerli bir telefon numarası giriniz'
  }),
  bio: Joi.string().min(10).max(500).optional().messages({
    'string.min': 'Biyografi en az 10 karakter olmalıdır',
    'string.max': 'Biyografi en fazla 500 karakter olmalıdır'
  }),
  serviceCategories: Joi.array().items(Joi.string()).min(1).optional().messages({
    'array.min': 'En az bir servis kategorisi seçilmelidir'
  }),
  vehicleBrands: Joi.array().items(Joi.string()).min(1).optional().messages({
    'array.min': 'En az bir araç markası seçilmelidir'
  })
});
