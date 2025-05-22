/**
 * Callback service for sending tunnel URLs to external services
 *
 * @module services/callback
 */

const http = require('http');
const https = require('https');
const url = require('url');
const logger = require("../logger");

/**
 * Send the tunnel URL to the callback URL
 *
 * @param {string} tunnelUrl - The tunnel URL to send
 * @param {Object} config - The configuration object
 * @returns {Promise<void>}
 */
async function sendCallback(tunnelUrl, config) {
    // Skip if the callback URL is not configured
    if (!config.CALLBACK_URL) {
        return;
    }

    try {
        const parsedUrl = url.parse(config.CALLBACK_URL);
        const isHttps = parsedUrl.protocol === 'https:';
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': config.CONTENT_TYPE_JSON
            }
        };

        // Add auth header if configured
        if (config.CALLBACK_AUTH_HEADER) {
            options.headers['Authorization'] = config.CALLBACK_AUTH_HEADER;
        }

        // Prepare the request data
        const data = JSON.stringify({
            tunnelUrl: tunnelUrl
        });
        options.headers['Content-Length'] = Buffer.byteLength(data);

        return new Promise((resolve, reject) => {
            // Create the request
            const req = (isHttps ? https : http).request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        logger.info(`Successfully sent tunnel URL to callback: ${config.CALLBACK_URL}`);
                        resolve();
                    } else {
                        logger.error(`Failed to send tunnel URL to callback. Status: ${res.statusCode}, Response: ${responseData}`);
                        reject(new Error(`HTTP error: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                logger.error(`Error sending tunnel URL to callback: ${error.message}`);
                reject(error);
            });

            // Send the request
            req.write(data);
            req.end();
        });
    } catch (error) {
        logger.error(`Failed to send callback: ${error.message}`);
    }
}

/**
 * Set up a periodic callback to ensure a tunnel is online
 *
 * @param {string} tunnelUrl - The tunnel URL to send
 * @param {Object} config - The configuration object
 * @returns {Function} A function to stop the periodic callback
 */
function setupPeriodicCallback(tunnelUrl, config) {
    if (!config.CALLBACK_URL || config.CALLBACK_INTERVAL <= 0) {
        return () => {
        }; // Return a no-op function if callbacks are not enabled
    }

    logger.info(`Setting up periodic callback every ${config.CALLBACK_INTERVAL / 1000} seconds`);
    const intervalId = setInterval(() => {
        sendCallback(tunnelUrl, config).catch(error => {
            logger.error(`Error in periodic callback: ${error.message}`);
        });
    }, config.CALLBACK_INTERVAL);

    // Return a function to stop the periodic callback
    return () => {
        clearInterval(intervalId);
    };
}

module.exports = {
    sendCallback,
    setupPeriodicCallback
};