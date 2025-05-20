/**
 * HTTP Proxy Server - Main Entry Point
 *
 * This module implements a simple HTTP proxy server that forwards requests to a destination
 * specified in the 'x-destination-url' header. It supports both HTTP and HTTPS protocols.
 * It can also automatically create an ngrok tunnel or a Cloudflare tunnel to expose the server to the internet.
 *
 * @module smart-relay
 * @author Nur Zazin
 */

const http = require('http');
const ngrok = require('ngrok');
const cloudflared = require('cloudflared');
const { handleRequest } = require('./request-handlers');
const { 
    PORT, 
    NGROK_ENABLED, 
    NGROK_AUTHTOKEN, 
    NGROK_REGION,
    CLOUDFLARE_ENABLED,
    CLOUDFLARE_TOKEN,
    CLOUDFLARE_HOSTNAME
} = require('./config');

// Create and start the proxy server
const server = http.createServer(handleRequest);

server.listen(PORT, async () => {
    console.log(`Proxy server is running on port ${PORT}`);

    // Start ngrok tunnel if enabled
    if (NGROK_ENABLED) {
        try {
            // Check if authtoken is provided
            if (!NGROK_AUTHTOKEN) {
                console.warn('Ngrok authtoken is not provided. Public tunnels may be limited.');
            }

            // Configure ngrok options
            const ngrokOptions = {
                addr: PORT,
                region: NGROK_REGION
            };

            // Add authtoken if provided
            if (NGROK_AUTHTOKEN) {
                ngrokOptions.authtoken = NGROK_AUTHTOKEN;
            }

            // Start ngrok tunnel
            const url = await ngrok.connect(ngrokOptions);
            console.log(`Ngrok tunnel is running at: ${url}`);
            console.log(`You can access your proxy server from the internet using the above URL.`);
        } catch (error) {
            console.error(`Failed to start ngrok tunnel: ${error.message}`);
        }
    }

    // Start Cloudflare tunnel if enabled
    if (CLOUDFLARE_ENABLED) {
        try {
            // Check if token is provided
            if (!CLOUDFLARE_TOKEN) {
                console.error('Cloudflare token is required for creating a tunnel.');
                return;
            }

            // Configure Cloudflare tunnel options
            const cloudflareOptions = {
                token: CLOUDFLARE_TOKEN,
                hostname: CLOUDFLARE_HOSTNAME,
                url: `http://localhost:${PORT}`
            };

            // Start Cloudflare tunnel
            const tunnel = await cloudflared.connect(cloudflareOptions);
            console.log(`Cloudflare tunnel is running at: ${tunnel.url}`);
            console.log(`You can access your proxy server from the internet using the above URL.`);

            // Handle tunnel closure
            process.on('SIGINT', async () => {
                console.log('Closing Cloudflare tunnel...');
                await tunnel.disconnect();
                process.exit(0);
            });
        } catch (error) {
            console.error(`Failed to start Cloudflare tunnel: ${error.message}`);
        }
    }
});
