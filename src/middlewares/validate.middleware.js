import { sendError } from '../helpers/response.helper.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

export const rules = {
  required: (value) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return 'không được để trống';
    }
    return null;
  },

  email: (value) => {
    if (value && !EMAIL_REGEX.test(value)) return 'không hợp lệ';
    return null;
  },

  phone: (value) => {
    if (value && !PHONE_REGEX.test(value)) return 'không hợp lệ (VD: 0912345678)';
    return null;
  },

  minLength: (value, min) => {
    if (value && String(value).length < min) return `phải có ít nhất ${min} ký tự`;
    return null;
  },

  maxLength: (value, max) => {
    if (value && String(value).length > max) return `không được quá ${max} ký tự`;
    return null;
  },

  inRange: (value, min, max) => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) return `phải từ ${min} đến ${max}`;
    return null;
  },

  positiveInt: (value) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 1) return 'phải là số nguyên dương';
    return null;
  },

  oneOf: (value, allowed) => {
    if (!value || !allowed.includes(value)) return `phải là một trong: ${allowed.join(', ')}`;
    return null;
  }
};

export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const source = schema.source === 'body' ? req.body : req.query;

    for (const [field, config] of Object.entries(schema.fields)) {
      const value = source[field];
      const displayName = config.name || field;

      for (const [ruleName, ...args] of config.rules) {
        if (rules[ruleName]) {
          const errorMessage = rules[ruleName](value, ...args);

          if (errorMessage) {
            errors.push(`${displayName} ${errorMessage}`);
            break;
          }
        }
      }
    }

    if (errors.length > 0) {
      return sendError(res, 'Dữ liệu không hợp lệ', errors, 400);
    }

    next();
  };
};
