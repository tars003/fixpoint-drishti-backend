/**
 * Standardized API response helper
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Response message
 * @param {Object} data - Response data (optional)
 * @param {Object} errors - Error details (optional)
 * @returns {Object} Express response
 */
const apiResponse = (res, statusCode, message, data = null, errors = null) => {
  const response = {
    success: statusCode < 400,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  
  return res.status(statusCode).json(response);
};

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} Express response
 */
const successResponse = (res, message = 'Success', data = null) => {
  return apiResponse(res, 200, message, data);
};

/**
 * Created response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} Express response
 */
const createdResponse = (res, message = 'Created successfully', data = null) => {
  return apiResponse(res, 201, message, data);
};

/**
 * Bad request response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 * @returns {Object} Express response
 */
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return apiResponse(res, 400, message, null, errors);
};

/**
 * Unauthorized response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return apiResponse(res, 401, message);
};

/**
 * Not found response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const notFoundResponse = (res, message = 'Not found') => {
  return apiResponse(res, 404, message);
};

/**
 * Internal server error response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const serverErrorResponse = (res, message = 'Internal server error') => {
  return apiResponse(res, 500, message);
};

module.exports = {
  apiResponse,
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse
};