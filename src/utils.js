/**
 * Utility functions for the HTTP proxy server
 * 
 * @module utils
 */

const { CONTENT_TYPE_JSON } = require('./config');

/**
 * Creates a standardized error response in JSON format
 *
 * @param {string} code - The error code
 * @param {string} message - The error message
 * @returns {string} JSON formatted error response
 */
function createErrorResponse(code, message) {
    return JSON.stringify({
        error: {
            code: code,
            message: message
        }
    });
}

/**
 * Builds a full URL string from components
 *
 * @param {Object} parsedUrl - The parsed URL object
 * @param {string} path - The request path
 * @returns {string} The complete URL
 */
function buildFullUrl(parsedUrl, path) {
    return `${parsedUrl.protocol}//${parsedUrl.hostname}${path}`;
}

module.exports = {
    CONTENT_TYPE_JSON,
    createErrorResponse,
    buildFullUrl
};
