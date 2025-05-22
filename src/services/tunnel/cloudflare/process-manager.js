/**
 * Cloudflare tunnel process management utilities
 *
 * @module services/tunnel/cloudflare/process-manager
 */

const {spawn} = require('child_process');
const logger = require('./../../../logger');

/**
 * Create and manage a cloudflared tunnel process
 *
 * @param {Object} config - The configuration object
 * @param {Function} onTunnelUrl - Callback function called when tunnel URL is found
 * @param {Function} onError - Callback function called when an error occurs
 * @param {Function} onExit - Callback function called when the process exits
 * @param {Function} onClose - Callback function called when the process closes
 * @returns {Object} The tunnel process and a timeout ID
 */
function createTunnelProcess(config, onTunnelUrl, onError, onExit, onClose) {
    // Prepare command line arguments for cloudflared
    const args = ['tunnel'];

    // Add URL argument
    args.push('--url', `localhost:${config.PORT}`);
    logger.info(`Executing: cloudflared ${args.join(' ')}`);

    // Spawn cloudflared process in the background
    const tunnelProcess = spawn('cloudflared', args, {
        detached: true
    });

    // Add startTime property to track when the process was started
    tunnelProcess.startTime = Date.now();

    // Unref the child process to allow the Node.js process to exit independently
    tunnelProcess.unref();

    let tunnelUrl = null;
    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Set timeout for connection
    const timeout = setTimeout(() => {
        logger.error('Cloudflare tunnel connection timed out');
        process.kill(-tunnelProcess.pid); // Kill the process group
        onError(new Error('Cloudflare tunnel connection timed out after 30 seconds'));
    }, 30000); // 30-second timeout

    // Process stdout to extract tunnel URL
    tunnelProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;
        logger.info(`cloudflared: ${output.trim()}`);

        // Look for the tunnel URL in the output
        // The URL format is typically https://something.trycloudflare.com
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
            tunnelUrl = urlMatch[0];
            clearTimeout(timeout);
            logger.info(`Cloudflare tunnel is running at: ${tunnelUrl}`);
            logger.info(`You can access your proxy server from the internet using the above URL.`);
            onTunnelUrl(tunnelUrl, tunnelProcess);
        }
    });

    // Handle process exit
    tunnelProcess.on('exit', (code, signal) => {
        onExit(code, signal, tunnelProcess, tunnelUrl, timeout);
    });

    // Handle process error
    tunnelProcess.on('error', (error) => {
        clearTimeout(timeout);
        logger.error(`Cloudflare tunnel process error: ${error.message}`);
        onError(error, tunnelProcess, tunnelUrl);
    });

    // Handle process close
    tunnelProcess.on('close', (code, signal) => {
        onClose(code, signal, tunnelProcess, tunnelUrl, timeout);
    });

    return {tunnelProcess, timeout};
}

/**
 * Stop a cloudflared tunnel process
 *
 * @param {Object} tunnelProcess - The tunnel process to stop
 */
function stopTunnelProcess(tunnelProcess) {
    try {
        if (tunnelProcess && tunnelProcess.pid) {
            process.kill(-tunnelProcess.pid); // Kill the process group
        }
    } catch (error) {
        logger.error(`Error stopping cloudflared: ${error.message}`);
    }
}

module.exports = {
    createTunnelProcess,
    stopTunnelProcess
};