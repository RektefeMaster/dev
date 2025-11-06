/**
 * Form Validation Utility
 * Standart form validasyon fonksiyonları ve mesajları
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface FieldValidation {
  field: string;
  value: any;
  rules: ValidationRule[];
}

export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'phone'; message?: string }
  | { type: 'minLength'; min: number; message?: string }
  | { type: 'maxLength'; max: number; message?: string }
  | { type: 'match'; otherValue: any; message?: string }
  | { type: 'pattern'; pattern: RegExp; message?: string }
  | { type: 'custom'; validator: (value: any) => boolean; message: string };

/**
 * Tek bir alan için validasyon
 */
export const validateField = (value: any, rules: ValidationRule[]): ValidationResult => {
  for (const rule of rules) {
    const result = validateRule(value, rule);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
};

/**
 * Tek bir kural için validasyon
 */
const validateRule = (value: any, rule: ValidationRule): ValidationResult => {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return {
          isValid: false,
          message: rule.message || 'Bu alan zorunludur',
        };
      }
      if (typeof value === 'string' && value.trim().length === 0) {
        return {
          isValid: false,
          message: rule.message || 'Bu alan zorunludur',
        };
      }
      break;

    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return {
          isValid: false,
          message: rule.message || 'Geçerli bir e-posta adresi girin',
        };
      }
      break;

    case 'phone':
      if (value && !/^(\+90|0)?[5][0-9]{9}$/.test(value.replace(/\s/g, ''))) {
        return {
          isValid: false,
          message: rule.message || 'Geçerli bir telefon numarası girin',
        };
      }
      break;

    case 'minLength':
      if (value && typeof value === 'string' && value.trim().length < rule.min) {
        return {
          isValid: false,
          message: rule.message || `En az ${rule.min} karakter olmalıdır`,
        };
      }
      break;

    case 'maxLength':
      if (value && typeof value === 'string' && value.length > rule.max) {
        return {
          isValid: false,
          message: rule.message || `En fazla ${rule.max} karakter olabilir`,
        };
      }
      break;

    case 'match':
      if (value !== rule.otherValue) {
        return {
          isValid: false,
          message: rule.message || 'Değerler eşleşmiyor',
        };
      }
      break;

    case 'pattern':
      if (value && !rule.pattern.test(value)) {
        return {
          isValid: false,
          message: rule.message || 'Geçersiz format',
        };
      }
      break;

    case 'custom':
      if (!rule.validator(value)) {
        return {
          isValid: false,
          message: rule.message,
        };
      }
      break;
  }

  return { isValid: true };
};

/**
 * Birden fazla alan için validasyon
 */
export const validateForm = (fields: FieldValidation[]): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const field of fields) {
    const result = validateField(field.value, field.rules);
    if (!result.isValid) {
      isValid = false;
      errors[field.field] = result.message || 'Geçersiz değer';
    }
  }

  return { isValid, errors };
};

/**
 * Yaygın validasyon kuralları
 */
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    type: 'required',
    message,
  }),

  email: (message?: string): ValidationRule => ({
    type: 'email',
    message,
  }),

  phone: (message?: string): ValidationRule => ({
    type: 'phone',
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    type: 'minLength',
    min,
    message,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    type: 'maxLength',
    max,
    message,
  }),

  match: (otherValue: any, message?: string): ValidationRule => ({
    type: 'match',
    otherValue,
    message,
  }),

  pattern: (pattern: RegExp, message?: string): ValidationRule => ({
    type: 'pattern',
    pattern,
    message,
  }),

  custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),
};

/**
 * Örnek kullanım:
 * 
 * const emailResult = validateField(
 *   formData.email,
 *   [validationRules.required(), validationRules.email()]
 * );
 * 
 * const formResult = validateForm([
 *   { field: 'email', value: formData.email, rules: [validationRules.required(), validationRules.email()] },
 *   { field: 'password', value: formData.password, rules: [validationRules.required(), validationRules.minLength(6)] },
 *   { field: 'confirmPassword', value: formData.confirmPassword, rules: [validationRules.required(), validationRules.match(formData.password, 'Şifreler eşleşmiyor')] },
 * ]);
 */

