/**
 * Cloudflare tunnel service for exposing the proxy server to the internet
 *
 * @module services/tunnel/cloudflare
 */

const { spawn, execSync } = require('child_process');
const { sendCallback, setupPeriodicCallback } = require('../callback');

/**
 * Check if cloudflared is installed
 * 
 * @returns {boolean} True if cloudflared is installed, false otherwise
 */
function checkCloudflaredInstalled() {
    try {
        execSync('cloudflared --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error('Error: cloudflared is not installed or not available in PATH.');
        console.error('Please install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
        return false;
    }
}

/**
 * Create and start a Cloudflare tunnel with retry logic
 *
 * @param {Object} config - The configuration object
 * @param {number} retryCount - The current retry count
 * @param {number} maxRetries - The maximum number of retries
 * @returns {Promise<Object>} An object containing the tunnel URL and a stop function
 */
async function createTunnel(config, retryCount = 0, maxRetries = 3) {
    console.log(`Attempting to create Cloudflare tunnel (attempt ${retryCount + 1}/${maxRetries + 1})...`);

    try {
        // Get the tunnel URL when it's available
        return await new Promise((resolve, reject) => {
            // Prepare command line arguments for cloudflared
            const args = ['tunnel'];

            // Add URL argument
            args.push('--url', `localhost:${config.PORT}`);
            console.log(`Executing: cloudflared ${args.join(' ')}`);

            // Spawn cloudflared process in the background
            const tunnelProcess = spawn('cloudflared', args, {
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Unref the child process to allow the Node.js process to exit independently
            tunnelProcess.unref();

            let tunnelUrl = null;
            let stdoutBuffer = '';
            let stderrBuffer = '';

            // Set timeout for connection
            const timeout = setTimeout(() => {
                console.error('Cloudflare tunnel connection timed out');
                process.kill(-tunnelProcess.pid); // Kill the process group
                reject(new Error('Cloudflare tunnel connection timed out after 30 seconds'));
            }, 30000); // 30-second timeout

            // Process stdout to extract tunnel URL
            tunnelProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdoutBuffer += output;
                console.log(`cloudflared: ${output.trim()}`);

                // Look for the tunnel URL in the output
                // The URL format is typically https://something.trycloudflare.com
                const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                if (urlMatch && !tunnelUrl) {
                    tunnelUrl = urlMatch[0];
                    clearTimeout(timeout);
                    console.log(`Cloudflare tunnel is running at: ${tunnelUrl}`);
                    console.log(`You can access your proxy server from the internet using the above URL.`);
                    resolve({
                        url: tunnelUrl,
                        tunnel: {
                            stop: () => {
                                try {
                                    process.kill(-tunnelProcess.pid); // Kill the process group
                                } catch (error) {
                                    console.error(`Error stopping cloudflared: ${error.message}`);
                                }
                            }
                        }
                    });
                }
            });

            // Process stderr for errors
            tunnelProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderrBuffer += output;
                console.error(`cloudflared error: ${output.trim()}`);
            });
        });
    } catch (error) {
        // If we haven't reached max retries, try again
        if (retryCount < maxRetries) {
            console.log(`Retrying in 5 seconds... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
            return createTunnel(config, retryCount + 1, maxRetries);
        }

        throw error;
    }
}

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
        // Create tunnel with retry logic
        const { url: tunnelUrl, tunnel } = await createTunnel(config);

        // Only proceed with callback setup if we have a valid tunnel URL
        if (tunnelUrl) {
            // Send callback with the tunnel URL initially
            try {
                await sendCallback(tunnelUrl, config);
                console.log(`Successfully sent initial callback to ${config.CALLBACK_URL}`);
            } catch (callbackError) {
                console.error(`Failed to send initial callback: ${callbackError.message}`);
            }

            // Set up periodic callback
            const stopCallback = setupPeriodicCallback(tunnelUrl, config);

            // Return the tunnel URL and a stop function
            return {
                url: tunnelUrl,
                stop: () => {
                    console.log('Closing Cloudflare tunnel...');
                    try {
                        stopCallback();
                        tunnel.stop();
                        console.log('Cloudflare tunnel closed successfully');
                    } catch (stopError) {
                        console.error(`Error closing Cloudflare tunnel: ${stopError.message}`);
                    }
                }
            };
        } else {
            console.warn('Cloudflare tunnel was created but no URL was returned.');
            return { url: null, stop: () => {} };
        }
    } catch (error) {
        console.error(`Failed to establish Cloudflare tunnel after multiple attempts: ${error.message}`);
        console.log('Please check your Cloudflare token and network connectivity.');
        console.log('If the problem persists, try the following:');
        console.log('1. Verify your Cloudflare token is valid and has the necessary permissions');
        console.log('2. Check your network connectivity and firewall settings');
        console.log('3. Try running with a different token or configuration');
        throw error;
    }
}

module.exports = {
    startCloudflaredTunnel
};