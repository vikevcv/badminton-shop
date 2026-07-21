import { sendError } from '../helpers/response.helper.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409; // Conflict
    message = 'Dữ liệu này đã tồn tại trong hệ thống (Trùng lặp khóa Unique).';
  }
  
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400; // Bad Request
    message = 'Lỗi ràng buộc dữ liệu (Foreign Key constraint fails).';
  }

  // Dev log
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`[ERROR PATH]: ${req.originalUrl}`);
    // eslint-disable-next-line no-console
    console.error(`[ERROR DETAILS]: \n${err.stack}`);
  }

  // Response (API vs Web)
  if (req.originalUrl.startsWith('/api/')) {
    return sendError(res, message, err.errors || [], statusCode);
  }

  return res.status(statusCode).render('error', {
    title: 'Đã xảy ra lỗi | Badminton Shop',
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    layout: false,
  });
};