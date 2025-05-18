/**
 * HTTP Proxy Server - Main Entry Point
 *
 * This module implements a simple HTTP proxy server that forwards requests to a destination
 * specified in the 'x-destination-url' header. It supports both HTTP and HTTPS protocols.
 *
 * @module smart-relay
 * @author Nur Zazin
 */

const http = require('http');
const { handleRequest } = require('./request-handlers');
const { PORT } = require('./config');

// Create and start the proxy server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});