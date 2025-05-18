/**
 * Request handling functions for the HTTP proxy server
 * 
 * @module request-handlers
 */

const { handleMissingDestination } = require('./error-handlers');
const { forwardRequest } = require('./proxy');

/**
 * Main request handler for the proxy server
 *
 * @param {http.IncomingMessage} req - The client request object
 * @param {http.ServerResponse} res - The server response object
 * @returns {void}
 */
function handleRequest(req, res) {
    const destinationUrl = req.headers['x-destination-url'];

    if (!destinationUrl) {
        return handleMissingDestination(req, res);
    }

    forwardRequest(req, res, destinationUrl);
}

module.exports = {
    handleRequest
};