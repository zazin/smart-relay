/**
 * Error handling functions for the HTTP proxy server
 * 
 * @module error-handlers
 */

const { CONTENT_TYPE_JSON, createErrorResponse, buildFullUrl } = require('./utils');
const logger = require('./logger');

/**
 * Handles requests with missing destination URL header
 *
 * @param {http.IncomingMessage} req - The client request object
 * @param {http.ServerResponse} res - The server response object
 * @returns {void}
 */
function handleMissingDestination(req, res) {
    logger.error(`400 | (Missing X-Destination-URL header) | ${req.method} | /`);
    res.writeHead(400, {'Content-Type': CONTENT_TYPE_JSON});
    res.end(createErrorResponse('001', 'X-Destination-URL header is required.'));
}

/**
 * Handles proxy request errors
 *
 * @param {Error} err - The error object
 * @param {http.ServerResponse} clientRes - The client response
 * @param {Object} parsedUrl - The parsed destination URL
 * @param {Object} options - The request options
 * @param {http.IncomingMessage} clientReq - The original client request
 * @returns {void}
 */
function handleProxyError(err, clientRes, parsedUrl, options, clientReq) {
    const fullUrl = buildFullUrl(parsedUrl, options.path);
    logger.error(`500 (Error: ${err.message}) | ${clientReq.method} | ${fullUrl}`);

    clientRes.writeHead(500, {'Content-Type': CONTENT_TYPE_JSON});
    clientRes.end(createErrorResponse('002', `Proxy request failed: ${err.message}`));
}

module.exports = {
    handleMissingDestination,
    handleProxyError
};
