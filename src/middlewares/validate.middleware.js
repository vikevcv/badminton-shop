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
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) return `phải từ ${min} đến ${max}`;
    return null;
  },

  positiveInt: (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 1) return 'phải là số nguyên dương';
    return null;
  },

  maxValue: (value, max) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num > max) return `không được quá ${max}`;
    return null;
  },

  date: (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (isNaN(new Date(value).getTime())) return 'không hợp lệ (VD: 2024-01-01)';
    return null;
  },

  nonNegativeInt: (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) return 'phải là số nguyên không âm';
    return null;
  },

  positiveNumber: (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num <= 0) return 'phải là số dương';
    return null;
  },

  nonNegativeNumber: (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num < 0) return 'phải là số không âm';
    return null;
  },

  positiveIntArray: (value) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    if (!Array.isArray(value) || value.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1)) {
      return 'phải là mảng số nguyên dương';
    }
    return null;
  },

  oneOf: (value, allowed) => {
    if (value === undefined || value === null || value === '') return null;
    if (!allowed.includes(value)) return `phải là một trong: ${allowed.join(', ')}`;
    return null;
  }
};

export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const source =
      schema.source === 'body' ? req.body
      : schema.source === 'params' ? req.params
      : req.query;

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
