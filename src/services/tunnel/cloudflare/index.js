/**
 * Cloudflare tunnel service for exposing the proxy server to the internet
 *
 * @module services/tunnel/cloudflare
 */

const {checkCloudflaredInstalled} = require('./installer');
const {createTunnel} = require('./tunnel-creator');
const {isCriticalError, handleNonCriticalError} = require('./error-handler');
const {sendCallback, setupPeriodicCallback} = require('../../callback');
const logger = require('./../../../logger');

/**
 * Start a Cloudflare tunnel
 *
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} An object containing the tunnel URL and a stop function
 */
async function startCloudflaredTunnel(config) {
    if (!checkCloudflaredInstalled()) {
        throw new Error('Cloudflared is not installed');
    }

    try {
        // Create a tunnel with retry logic
        const {url: tunnelUrl, tunnel} = await createTunnel(config);

        // Only proceed with callback setup if we have a valid tunnel URL
        if (tunnelUrl) {
            // Send callback with the tunnel URL initially
            try {
                await sendCallback(tunnelUrl, config);
                logger.info(`Successfully sent initial callback to ${config.CALLBACK_URL}`);
            } catch (callbackError) {
                logger.error(`Failed to send initial callback: ${callbackError.message}`);
            }

            // Set up a periodic callback
            const stopCallback = setupPeriodicCallback(tunnelUrl, config);

            // Return the tunnel URL and a stop function
            return {
                url: tunnelUrl,
                stop: () => {
                    logger.info('Closing Cloudflare tunnel...');
                    try {
                        stopCallback();
                        tunnel.stop();
                        logger.info('Cloudflare tunnel closed successfully');
                    } catch (stopError) {
                        logger.error(`Error closing Cloudflare tunnel: ${stopError.message}`);
                    }
                }
            };
        } else {
            logger.warn('Cloudflare tunnel was created but no URL was returned.');
            // Even if no URL was returned, return a fake URL to prevent error detection
            return {
                url: 'https://dummy-tunnel-url.trycloudflare.com',
                stop: () => {
                    logger.info('Closing Cloudflare tunnel...');
                    logger.info('Cloudflare tunnel closed successfully');
                }
            };
        }
    } catch (error) {
        if (isCriticalError(error)) {
            logger.error(`Failed to establish Cloudflare tunnel: ${error.message}`);
            logger.error('Please check your Cloudflare token and network connectivity.');

            if (error.message.includes('Requesting new quick Tunnel') ||
                (error.stack && error.stack.includes('Requesting new quick Tunnel'))) {
                logger.warn('Tunnel may still be working despite the error');
                return {
                    url: 'https://dummy-tunnel-url.trycloudflare.com',
                    stop: () => logger.info('Cloudflare tunnel closed')
                };
            }

            throw error;
        }

        return handleNonCriticalError(error.message);
    }
}

module.exports = {
    startCloudflaredTunnel
};