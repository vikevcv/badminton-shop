export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Không tìm thấy đường dẫn ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};