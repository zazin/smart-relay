/**
 * Cloudflare tunnel installer utilities
 *
 * @module services/tunnel/cloudflare/installer
 */

const { execSync } = require('child_process');

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

module.exports = {
    checkCloudflaredInstalled
};