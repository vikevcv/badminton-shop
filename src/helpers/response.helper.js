export const sendSuccess = (res, data = null, message = null, extras = {}, statusCode = 200) => {
  const response = { success: true, data };
  if (message !== null) response.message = message;
  return res.status(statusCode).json({ ...response, ...extras });
};

export const sendError = (res, message = 'Đã xảy ra lỗi', errors = [], statusCode = 400) => {
  const formatErrors = Array.isArray(errors) ? errors : [errors];
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: formatErrors
  });
};