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
const https = require('https');
const url = require('url');
const ngrok = require('ngrok');
const cloudflared = require('cloudflared');
const {handleRequest} = require('./request-handlers');
const getConfig = require('./config');

// Flag to track if callback has been sent
let callbackSent = false;

/**
 * Send the tunnel URL to the callback URL
 *
 * @param {string} tunnelUrl - The tunnel URL to send
 * @param {Object} config - The configuration object
 * @returns {Promise<void>}
 */
async function sendCallback(tunnelUrl, config) {
    // Skip if the callback URL is not configured or the callback was already sent
    if (!config.CALLBACK_URL || callbackSent) {
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
                        console.log(`Successfully sent tunnel URL to callback: ${config.CALLBACK_URL}`);
                        callbackSent = true;
                        resolve();
                    } else {
                        console.error(`Failed to send tunnel URL to callback. Status: ${res.statusCode}, Response: ${responseData}`);
                        reject(new Error(`HTTP error: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`Error sending tunnel URL to callback: ${error.message}`);
                reject(error);
            });

            // Send the request
            req.write(data);
            req.end();
        });
    } catch (error) {
        console.error(`Failed to send callback: ${error.message}`);
    }
}

/**
 * Start the proxy server
 */
async function startServer() {
    try {
        // Load configuration
        const config = await getConfig();

        // Create the proxy server
        const server = http.createServer(handleRequest);

        // Start listening
        server.listen(config.PORT, async () => {
            console.log(`Proxy server is running on port ${config.PORT}`);

            // Start ngrok tunnel if enabled
            if (config.NGROK_ENABLED) {
                try {
                    // Check if auth token is provided
                    if (!config.NGROK_TOKEN) {
                        console.warn('Ngrok authtoken is not provided. Public tunnels may be limited.');
                    }

                    // Configure ngrok options
                    const ngrokOptions = {
                        addr: config.PORT,
                        region: config.NGROK_REGION
                    };

                    // Add auth token if provided
                    if (config.NGROK_TOKEN) {
                        ngrokOptions.authtoken = config.NGROK_TOKEN;
                    }

                    // Start ngrok tunnel
                    const url = await ngrok.connect(ngrokOptions);
                    console.log(`Ngrok tunnel is running at: ${url}`);
                    console.log(`You can access your proxy server from the internet using the above URL.`);

                    // Send callback with the tunnel URL
                    await sendCallback(url, config);
                } catch (error) {
                    console.error(`Failed to start ngrok tunnel: ${error.message}`);
                }
            }

            // Start Cloudflare tunnel if enabled
            if (config.CLOUDFLARE_ENABLED) {
                try {
                    // Check if a token is provided
                    if (!config.CLOUDFLARE_TOKEN) {
                        console.error('Cloudflare token is required for creating a tunnel.');
                        return;
                    }

                    // Configure Cloudflare tunnel options
                    const cloudflareOptions = {
                        token: config.CLOUDFLARE_TOKEN,
                        hostname: config.CLOUDFLARE_HOSTNAME,
                        url: `http://localhost:${config.PORT}`
                    };

                    // Start Cloudflare tunnel
                    const tunnel = await cloudflared.connect(cloudflareOptions);
                    console.log(`Cloudflare tunnel is running at: ${tunnel.url}`);
                    console.log(`You can access your proxy server from the internet using the above URL.`);

                    // Send callback with the tunnel URL
                    await sendCallback(tunnel.url, config);

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
    } catch (error) {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Start the server
startServer();
