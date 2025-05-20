/**
 * Tunnel services for exposing the proxy server to the internet
 *
 * @module services/tunnel
 */

const { startNgrokTunnel } = require('./ngrok');
const { startCloudflaredTunnel } = require('./cloudflare/index');

/**
 * Start a tunnel based on the configuration
 *
 * @param {Object} config - The configuration object
 * @returns {Promise<Object|null>} An object containing the tunnel URL and a stop function, or null if no tunnel is enabled
 */
async function startTunnel(config) {
    if (config.NGROK_ENABLED) {
        try {
            return await startNgrokTunnel(config);
        } catch (error) {
            console.error(`Failed to start ngrok tunnel: ${error.message}`);
        }
    }

    if (config.CLOUDFLARE_ENABLED) {
        try {
            return await startCloudflaredTunnel(config);
        } catch (error) {
            console.error(`Failed to start Cloudflare tunnel: ${error.message}`);
        }
    }

    return null;
}

module.exports = {
    startTunnel,
    startNgrokTunnel,
    startCloudflaredTunnel
};
