import { sendError } from '../helpers/response.helper.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/;

export const rules = {
  required: (field, value) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return `${field} không được để trống`;
    }
    return null;
  },

  email: (_field, value) => {
    if (value && !EMAIL_REGEX.test(value)) {
      return 'Email không hợp lệ';
    }
    return null;
  },

  phone: (_field, value) => {
    if (value && !PHONE_REGEX.test(value)) {
      return 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }
    return null;
  },

  minLength: (field, value, min) => {
    if (value && value.length < min) {
      return `${field} phải có ít nhất ${min} ký tự`;
    }
    return null;
  },

  maxLength: (field, value, max) => {
    if (value && value.length > max) {
      return `${field} không được quá ${max} ký tự`;
    }
    return null;
  },

  inRange: (field, value, min, max) => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return `${field} phải từ ${min} đến ${max}`;
    }
    return null;
  },

  positiveInt: (field, value) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 1) {
      return `${field} phải là số nguyên dương`;
    }
    return null;
  },

  oneOf: (field, value, allowed) => {
    if (!allowed.includes(value)) {
      return `${field} phải là một trong: ${allowed.join(', ')}`;
    }
    return null;
  }
};

export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const source = schema.source === 'body' ? req.body : req.query;

    for (const [field, fieldRules] of Object.entries(schema.fields)) {
      const value = source[field];

      for (const rule of fieldRules) {
        if (typeof rule === 'function') {
          const error = rule(field, value);
          if (error) errors.push(error);
        } else if (Array.isArray(rule)) {
          const [ruleName, ...args] = rule;
          if (rules[ruleName]) {
            const displayField = args.length > 0 ? args[0] : field;
            const error = rules[ruleName](displayField, value, ...args.slice(1));
            if (error) errors.push(error);
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
