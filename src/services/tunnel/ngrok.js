/**
 * Ngrok tunnel service for exposing the proxy server to the internet
 *
 * @module services/tunnel/ngrok
 */

const {spawn, execSync} = require('child_process');
const {sendCallback, setupPeriodicCallback} = require('../callback');
const logger = require("../../logger");

/**
 * Check if ngrok is installed
 *
 * @returns {boolean} True if ngrok is installed, false otherwise
 */
function checkNgrokInstalled() {
    try {
        execSync('ngrok --version', {stdio: 'ignore'});
        return true;
    } catch (error) {
        logger.error('Error: ngrok is not installed or not available in PATH.');
        logger.error('Please install ngrok from https://ngrok.com/download');
        return false;
    }
}

/**
 * Start an ngrok tunnel
 *
 * @param {Object} config - The configuration object
 * @returns {Promise<Object>} An object containing the tunnel URL and a stop function
 */
async function startNgrokTunnel(config) {
    if (!checkNgrokInstalled()) {
        throw new Error('Ngrok is not installed');
    }

    // Check if an auth token is provided
    if (!config.NGROK_TOKEN) {
        logger.warn('Ngrok authtoken is not provided. Public tunnels may be limited.');
    }

    // Prepare command line arguments for ngrok
    const args = ['http', config.PORT];

    // Add a region if configured
    if (config.NGROK_REGION) {
        args.push('--region', config.NGROK_REGION);
    }

    logger.info(`Executing: ngrok ${args.join(' ')}`);

    // Spawn ngrok process
    const ngrokProcess = spawn('ngrok', args);

    return new Promise((resolve, reject) => {
        let tunnelUrl = null;
        let stdoutBuffer = '';
        let stderrBuffer = '';

        // Set timeout for connection
        const timeout = setTimeout(() => {
            logger.error('Ngrok tunnel connection timed out');
            ngrokProcess.kill();
            reject(new Error('Ngrok tunnel connection timed out after 30 seconds'));
        }, 30000); // 30-second timeout

        // Process stdout to extract tunnel URL
        ngrokProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutBuffer += output;
            logger.info(`ngrok: ${output.trim()}`);
        });

        // Process stderr for errors and to extract tunnel URL
        // Note: ngrok outputs its web interface URL to stderr
        ngrokProcess.stderr.on('data', async (data) => {
            const output = data.toString();
            stderrBuffer += output;
            logger.info(`ngrok output: ${output.trim()}`);

            // Look for the tunnel URL in the output
            // The URL format is typically https://something.ngrok.io
            const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/);
            if (urlMatch && !tunnelUrl) {
                tunnelUrl = urlMatch[0];
                clearTimeout(timeout);
                logger.info(`Ngrok tunnel is running at: ${tunnelUrl}`);
                logger.info(`You can access your proxy server from the internet using the above URL.`);

                // Send callback with the tunnel URL initially
                try {
                    await sendCallback(tunnelUrl, config);
                    logger.info(`Successfully sent initial callback to ${config.CALLBACK_URL}`);
                } catch (callbackError) {
                    logger.info(`Failed to send initial callback: ${callbackError.message}`);
                }

                // Set up a periodic callback
                const stopCallback = setupPeriodicCallback(tunnelUrl, config);

                // Resolve with the tunnel URL and a stop function
                resolve({
                    url: tunnelUrl,
                    stop: () => {
                        logger.info('Closing ngrok tunnel...');
                        try {
                            stopCallback();
                            ngrokProcess.kill();
                            logger.info('Ngrok tunnel closed successfully');
                        } catch (stopError) {
                            logger.error(`Error closing ngrok tunnel: ${stopError.message}`);
                        }
                    }
                });
            }
        });

        // Handle process exit
        ngrokProcess.on('exit', (code) => {
            clearTimeout(timeout);
            if (code !== 0 && !tunnelUrl) {
                logger.error(`Ngrok exited with code: ${code}`);
                reject(new Error(`Ngrok exited with code ${code}`));
            }
        });

        // Handle process error
        ngrokProcess.on('error', (err) => {
            clearTimeout(timeout);
            logger.error(`Error spawning ngrok: ${err.message || err}`);
            reject(new Error(`Error spawning ngrok: ${err.message || err}`));
        });
    });
}

module.exports = {
    startNgrokTunnel
};