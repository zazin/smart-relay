/**
 * HTTP Proxy Server
 *
 * This module implements a simple HTTP proxy server that forwards requests to a destination
 * specified in the 'x-destination-url' header. It supports both HTTP and HTTPS protocols.
 *
 * @module smart-relay
 * @author Nur Zazin
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Configuration constants
const PORT = 8080;
const CONTENT_TYPE_JSON = 'application/json';

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
 * Handles requests with missing destination URL header
 *
 * @param {http.IncomingMessage} req - The client request object
 * @param {http.ServerResponse} res - The server response object
 * @returns {void}
 */
function handleMissingDestination(req, res) {
    console.log(`400 | (Missing X-Destination-URL header) | ${req.method} | /`);
    res.writeHead(400, {'Content-Type': CONTENT_TYPE_JSON});
    res.end(createErrorResponse('001', 'X-Destination-URL header is required.'));
}

/**
 * Creates request options for the destination server
 *
 * @param {Object} parsedUrl - The parsed destination URL
 * @param {http|https} protocol - The protocol module to use
 * @param {http.IncomingMessage} req - The original client request
 * @returns {Object} Options for the proxy request
 */
function createRequestOptions(parsedUrl, protocol, req) {
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (protocol === https ? 443 : 80),
        path: url.resolve(parsedUrl.path, req.url),
        method: req.method,
        headers: {
            ...req.headers,
            'Host': parsedUrl.hostname // Override the Host header
        }
    };

    // Remove proxy-specific headers
    delete options.headers['x-destination-url'];

    return options;
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

/**
 * Handles successful proxy responses
 *
 * @param {http.IncomingMessage} proxyRes - The proxy response
 * @param {http.ServerResponse} clientRes - The client response
 * @param {Object} parsedUrl - The parsed destination URL
 * @param {Object} options - The request options
 * @param {http.IncomingMessage} clientReq - The original client request
 * @returns {void}
 */
function handleProxyResponse(proxyRes, clientRes, parsedUrl, options, clientReq) {
    const fullUrl = buildFullUrl(parsedUrl, options.path);
    console.log(`${proxyRes.statusCode} | OK | ${clientReq.method} | ${fullUrl}`);

    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, {end: true});
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
    console.log(`500 (Error: ${err.message}) | ${clientReq.method} | ${fullUrl}`);

    clientRes.writeHead(500, {'Content-Type': CONTENT_TYPE_JSON});
    clientRes.end(createErrorResponse('002', `Proxy request failed: ${err.message}`));
}

/**
 * Forwards the client request to the destination server
 *
 * @param {http.IncomingMessage} clientReq - The client request object
 * @param {http.ServerResponse} clientRes - The server response object
 * @param {string} destinationUrl - The URL to forward the request to
 * @returns {void}
 */
function forwardRequest(clientReq, clientRes, destinationUrl) {
    // Parse the destination URL
    const parsedUrl = url.parse(destinationUrl);

    // Determine the protocol to use
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Create options for the proxy request
    const options = createRequestOptions(parsedUrl, protocol, clientReq);

    // Forward the request to the destination server
    const proxyReq = protocol.request(options, (proxyRes) => {
        handleProxyResponse(proxyRes, clientRes, parsedUrl, options, clientReq);
    });

    // Handle proxy request errors
    proxyReq.on('error', (err) => {
        handleProxyError(err, clientRes, parsedUrl, options, clientReq);
    });

    // Pipe the client request to the proxy request
    clientReq.pipe(proxyReq, {end: true});
}

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

// Create and start the proxy server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
