/**
 * Proxy-related functions for the HTTP proxy server
 * 
 * @module proxy
 */

const http = require('http');
const https = require('https');
const url = require('url');
const { buildFullUrl } = require('./utils');
const { handleProxyError } = require('./error-handlers');

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

module.exports = {
    forwardRequest
};