'use strict';

class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new AppError(400, msg, details);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new AppError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new AppError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new AppError(404, msg);
  }

  static conflict(msg = 'Conflict') {
    return new AppError(409, msg);
  }

  static tooLarge(msg = 'Payload too large') {
    return new AppError(413, msg);
  }
}

module.exports = AppError;
