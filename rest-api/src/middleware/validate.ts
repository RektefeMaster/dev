import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 [VALIDATE] Validation başlatıldı, path:', req.path);
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      console.error('❌ [VALIDATE] Validation hatası:', errorMessage);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errorMessage
      });
    }
    
    console.log('✅ [VALIDATE] Validation başarılı');
    next();
  };
};
