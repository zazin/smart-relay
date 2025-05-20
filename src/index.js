/**
 * HTTP Proxy Server - Main Entry Point
 *
 * This module implements a simple HTTP proxy server that forwards requests to a destination
 * specified in the 'x-destination-url' header. It supports both HTTP and HTTPS protocols.
 * It can also automatically create a ngrok tunnel or a Cloudflare tunnel to expose the server to the internet.
 *
 * @module smart-relay
 * @author Nur Zazin
 */

const getConfig = require('./config');
const {startServer} = require('./server');
const logger = require('./logger');

/**
 * Initialize and start the proxy server
 */
async function init() {
    try {
        // Load configuration
        const config = await getConfig();
        logger.debug('config: ' + JSON.stringify(config));

        // Start the server
        const {server, tunnel} = await startServer(config);

        // Handle process termination
        process.on('SIGINT', async () => {
            logger.info('Shutting down...');

            // Close the server
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Start the server
init();
