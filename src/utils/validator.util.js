import validator from 'validator';

export const isValidDate = (date) => {
  return validator.isDate(date, {
    format: 'YYYY-MM-DD',
    strictMode: true
  });
};