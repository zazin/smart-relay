/**
 * HTTP Proxy Server setup and startup
 *
 * @module server
 */

const http = require('http');
const {handleRequest} = require('./request-handlers');
const {startTunnel} = require('./services/tunnel');
const logger = require('./logger');

/**
 * Start the proxy server
 *
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} An object containing the server and tunnel
 */
async function startServer(config) {
    // Create the proxy server
    const server = http.createServer(handleRequest);

    return new Promise((resolve, reject) => {
        // Start listening
        server.listen(config.PORT, async () => {
            logger.info(`Proxy server is running on port ${config.PORT}`);

            try {
                // Start a tunnel if enabled
                const tunnel = await startTunnel(config);

                // Return the server and tunnel
                resolve({
                    server,
                    tunnel
                });
            } catch (error) {
                logger.error(`Failed to start tunnel: ${error.message}`);
                // Still resolve with the server even if a tunnel fails
                resolve({
                    server,
                    tunnel: null
                });
            }
        });

        // Handle server errors
        server.on('error', (error) => {
            logger.error(`Server error: ${error.message}`);
            reject(error);
        });
    });
}

/**
 * Stop the server and tunnel
 *
 * @param {Object} server - The HTTP server
 * @param {Object} tunnel - The tunnel object
 * @returns {Promise<void>}
 */
async function stopServer(server, tunnel) {
    return new Promise((resolve) => {
        // Stop the tunnel if it exists
        if (tunnel && typeof tunnel.stop === 'function') {
            try {
                tunnel.stop();
            } catch (error) {
                logger.error(`Error stopping tunnel: ${error.message}`);
            }
        }

        // Close the server
        server.close(() => {
            logger.info('Server stopped');
            resolve();
        });
    });
}

module.exports = {
    startServer,
    stopServer
};
