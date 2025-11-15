import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import validator from 'validator';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

// ===== INPUT SANITIZATION MIDDLEWARE =====

/**
 * Comprehensive input sanitization middleware
 * Protects against XSS, NoSQL injection, and other attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body, query, and params
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid input data',
      error: 'Input validation failed'
    });
  }
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize key name
        const sanitizedKey = sanitizeString(key);
        // Sanitize value
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize a string value
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove XSS attempts
  let sanitized = xss(str, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Remove potential MongoDB operators - BUT preserve $ in legitimate strings like "100$"
  // Only remove MongoDB query operators like $gt, $lt, $ne, etc.
  // This is safer - only removes operators that could be used in NoSQL injection
  const mongoOperators = ['$gt', '$lt', '$gte', '$lte', '$ne', '$in', '$nin', '$exists', '$regex', '$or', '$and', '$not', '$nor', '$all', '$elemMatch', '$size', '$type', '$mod', '$text', '$where'];
  for (const op of mongoOperators) {
    sanitized = sanitized.replace(new RegExp(`\\${op}`, 'gi'), '');
  }
  
  return sanitized;
}

// ===== VALIDATION SCHEMAS =====

export const authValidation = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Name can only contain letters and spaces',
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    surname: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Surname can only contain letters and spaces',
        'string.min': 'Surname must be at least 2 characters',
        'string.max': 'Surname cannot exceed 50 characters'
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .custom((value, helpers) => {
        if (!validator.isEmail(value)) {
          return helpers.error('string.email');
        }
        return value.toLowerCase();
      }),
    phone: Joi.string()
      .pattern(/^(\+90|0)?[5][0-9]{9}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid Turkish phone number'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters'
      }),
    userType: Joi.string()
      .valid('driver', 'mechanic')
      .required(),
    experience: Joi.when('userType', {
      is: 'mechanic',
      then: Joi.number().min(0).max(50),
      otherwise: Joi.forbidden()
    }),
    city: Joi.when('userType', {
      is: 'mechanic',
      then: Joi.string().min(2).max(50),
      otherwise: Joi.forbidden()
    }),
    specialties: Joi.when('userType', {
      is: 'mechanic',
      then: Joi.array().items(Joi.string().max(100)).max(10),
      otherwise: Joi.forbidden()
    }),
    serviceCategories: Joi.when('userType', {
      is: 'mechanic',
      then: Joi.array().items(Joi.string().max(100)).max(20),
      otherwise: Joi.forbidden()
    })
  }),

  login: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .custom((value) => value.toLowerCase()),
    password: Joi.string()
      .min(1)
      .max(128)
      .required(),
    userType: Joi.string()
      .valid('driver', 'mechanic')
      .required()
  })
};

export const appointmentValidation = {
  create: Joi.object({
    serviceType: Joi.string()
      .valid('genel-bakim', 'agir-bakim', 'alt-takim', 'ust-takim', 
             'kaporta-boya', 'elektrik-elektronik', 'yedek-parca', 
             'lastik', 'egzoz-emisyon', 'arac-yikama', 'cekici')
      .required(),
    appointmentDate: Joi.date()
      .iso()
      .min('now')
      .required(),
    timeSlot: Joi.string()
      .pattern(/^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$/)
      .required(),
    vehicleId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid vehicle ID format'
      }),
    mechanicId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid mechanic ID format'
      }),
    description: Joi.string()
      .max(500)
      .optional(),
    price: Joi.number()
      .min(0)
      .max(100000)
      .optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'rejected', 'in-progress', 'completed', 'cancelled')
      .required(),
    rejectionReason: Joi.when('status', {
      is: 'rejected',
      then: Joi.string().max(500).required(),
      otherwise: Joi.forbidden()
    }),
    mechanicNotes: Joi.string()
      .max(1000)
      .optional()
  })
};

export const vehicleValidation = {
  create: Joi.object({
    brand: Joi.string()
      .min(2)
      .max(50)
      .required(),
    model: Joi.string()
      .min(2)
      .max(50)
      .required(),
    year: Joi.number()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .required(),
    plateNumber: Joi.string()
      .pattern(/^[0-9]{2}\s?[A-Z]{1,3}\s?[0-9]{1,4}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid Turkish license plate (e.g., 34 ABC 123)'
      }),
    color: Joi.string()
      .min(2)
      .max(30)
      .optional(),
    engineSize: Joi.string()
      .max(20)
      .optional(),
    fuelType: Joi.string()
      .valid('gasoline', 'diesel', 'electric', 'hybrid')
      .required(),
    mileage: Joi.number()
      .min(0)
      .max(2000000)
      .optional(),
    transmission: Joi.string()
      .valid('manual', 'automatic')
      .optional()
  })
};

export const messageValidation = {
  send: Joi.object({
    receiverId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid receiver ID format'
      }),
    content: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 1000 characters'
      }),
    messageType: Joi.string()
      .valid('text', 'image', 'file')
      .default('text')
  })
};

// ===== PAGINATION VALIDATION SCHEMA =====

/**
 * Standard pagination validation schema
 * Used for query parameters: page, limit, sortBy, sortOrder
 */
export const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Sayfa numarası bir sayı olmalıdır',
    'number.integer': 'Sayfa numarası tam sayı olmalıdır',
    'number.min': 'Sayfa numarası en az 1 olmalıdır'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit bir sayı olmalıdır',
    'number.integer': 'Limit tam sayı olmalıdır',
    'number.min': 'Limit en az 1 olmalıdır',
    'number.max': 'Limit en fazla 100 olabilir'
  }),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Sıralama yönü "asc" veya "desc" olmalıdır'
  })
});

// ===== VALIDATION MIDDLEWARE FACTORY =====

/**
 * Creates a validation middleware for a specific schema
 */
export const validateInput = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: errorMessage,
        details: error.details
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// ===== SECURITY HEADERS MIDDLEWARE =====

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add request ID for tracking
  const requestId = generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add response time header (set once when response starts)
  const startTime = Date.now();
  res.once('finish', () => {
    try {
      const responseTime = Date.now() - startTime;
      // Only set header if response hasn't been sent
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${responseTime}ms`);
      }
    } catch (error) {
      // Ignore header setting errors after response is sent
    }
  });
  
  next();
};

// ===== UTILITY FUNCTIONS =====

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== MONGODB SANITIZATION =====

export const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    }
});