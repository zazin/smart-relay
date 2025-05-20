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
const {spawn} = require('child_process');
const {handleRequest} = require('./request-handlers');
const getConfig = require('./config');

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
                        console.log(`Successfully sent tunnel URL to callback: ${config.CALLBACK_URL}`);
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
        console.log('config: ', config)

        // Create the proxy server
        const server = http.createServer(handleRequest);

        // Start listening
        server.listen(config.PORT, async () => {
            console.log(`Proxy server is running on port ${config.PORT}`);

            // Start ngrok tunnel if enabled
            if (config.NGROK_ENABLED) {
                try {
                    // Check if ngrok is installed
                    try {
                        const {execSync} = require('child_process');
                        execSync('ngrok --version', {stdio: 'ignore'});
                    } catch (error) {
                        console.error('Error: ngrok is not installed or not available in PATH.');
                        console.error('Please install ngrok from https://ngrok.com/download');
                        return;
                    }

                    // Check if auth token is provided
                    if (!config.NGROK_TOKEN) {
                        console.warn('Ngrok authtoken is not provided. Public tunnels may be limited.');
                    }

                    // Prepare command line arguments for ngrok
                    const args = ['http', config.PORT];

                    // Add region if configured
                    if (config.NGROK_REGION) {
                        args.push('--region', config.NGROK_REGION);
                    }

                    console.log(`Executing: ngrok ${args.join(' ')}`);

                    // Spawn ngrok process
                    const ngrokProcess = spawn('ngrok', args);

                    let tunnelUrl = null;
                    let stdoutBuffer = '';
                    let stderrBuffer = '';

                    // Set timeout for connection
                    const timeout = setTimeout(() => {
                        console.error('Ngrok tunnel connection timed out');
                        ngrokProcess.kill();
                        throw new Error('Ngrok tunnel connection timed out after 30 seconds');
                    }, 30000); // 30 second timeout

                    // Process stdout to extract tunnel URL
                    ngrokProcess.stdout.on('data', (data) => {
                        const output = data.toString();
                        stdoutBuffer += output;
                        console.log(`ngrok: ${output.trim()}`);
                    });

                    // Process stderr for errors and to extract tunnel URL
                    // Note: ngrok outputs its web interface URL to stderr
                    ngrokProcess.stderr.on('data', async (data) => {
                        const output = data.toString();
                        stderrBuffer += output;
                        console.log(`ngrok output: ${output.trim()}`);

                        // Look for the tunnel URL in the output
                        // The URL format is typically https://something.ngrok.io
                        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/);
                        if (urlMatch && !tunnelUrl) {
                            tunnelUrl = urlMatch[0];
                            clearTimeout(timeout);
                            console.log(`Ngrok tunnel is running at: ${tunnelUrl}`);
                            console.log(`You can access your proxy server from the internet using the above URL.`);

                            // Send callback with the tunnel URL initially
                            try {
                                await sendCallback(tunnelUrl, config);
                                console.log(`Successfully sent initial callback to ${config.CALLBACK_URL}`);
                            } catch (callbackError) {
                                console.error(`Failed to send initial callback: ${callbackError.message}`);
                            }

                            // Set up periodic callback to ensure tunnel is online
                            if (config.CALLBACK_URL && config.CALLBACK_INTERVAL > 0) {
                                console.log(`Setting up periodic callback every ${config.CALLBACK_INTERVAL / 1000} seconds`);
                                const intervalId = setInterval(() => {
                                    sendCallback(tunnelUrl, config).catch(error => {
                                        console.error(`Error in periodic callback: ${error.message}`);
                                    });
                                }, config.CALLBACK_INTERVAL);

                                // Clear interval when process exits
                                process.on('SIGINT', () => {
                                    clearInterval(intervalId);
                                    ngrokProcess.kill();
                                });
                            }
                        }
                    });

                    // Handle process exit
                    ngrokProcess.on('exit', (code) => {
                        clearTimeout(timeout);
                        if (code !== 0 && !tunnelUrl) {
                            console.error(`Ngrok exited with code: ${code}`);
                            throw new Error(`Ngrok exited with code ${code}`);
                        }
                    });

                    // Handle process error
                    ngrokProcess.on('error', (err) => {
                        clearTimeout(timeout);
                        console.error(`Error spawning ngrok: ${err.message || err}`);
                        throw new Error(`Error spawning ngrok: ${err.message || err}`);
                    });

                    // Handle process termination
                    process.on('SIGINT', () => {
                        console.log('Closing ngrok tunnel...');
                        try {
                            ngrokProcess.kill();
                            console.log('Ngrok tunnel closed successfully');
                        } catch (stopError) {
                            console.error(`Error closing ngrok tunnel: ${stopError.message}`);
                        }
                    });
                } catch (error) {
                    console.error(`Failed to start ngrok tunnel: ${error.message}`);
                }
            }

            // Start Cloudflare tunnel if enabled
            if (config.CLOUDFLARE_ENABLED) {
                try {
                    // Check if cloudflared is installed
                    try {
                        const {execSync} = require('child_process');
                        execSync('cloudflared --version', {stdio: 'ignore'});
                    } catch (error) {
                        console.error('Error: cloudflared is not installed or not available in PATH.');
                        console.error('Please install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
                        return;
                    }

                    // Function to create and start a tunnel with retry logic
                    const createTunnel = async (retryCount = 0, maxRetries = 3) => {
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

                                // Handle process exit
                                tunnelProcess.on('exit', (code) => {
                                    clearTimeout(timeout);

                                    if (code !== 0 && !tunnelUrl) {
                                        console.error(`Tunnel exited with code: ${code}`);
                                        if (code === 255) {
                                            console.error('This error often indicates an authentication issue with your Cloudflare token or network connectivity problems.');
                                            reject(new Error(`Cloudflare tunnel exited with code ${code}`));
                                        } else {
                                            // If we already resolved with a URL, don't reject
                                            if (!tunnelUrl) {
                                                reject(new Error(`Cloudflare tunnel exited with code ${code}`));
                                            }
                                        }
                                    } else if (!tunnelUrl) {
                                        // If process exited normally but we didn't get a URL
                                        resolve({
                                            url: null,
                                            tunnel: {
                                                stop: () => {
                                                } // No-op since process already exited
                                            }
                                        });
                                    }
                                });

                                // Handle process error
                                tunnelProcess.on('error', (err) => {
                                    clearTimeout(timeout);
                                    console.error(`Error spawning cloudflared: ${err.message || err}`);
                                    reject(new Error(`Error spawning cloudflared: ${err.message || err}`));
                                });
                            });
                        } catch (error) {
                            // If we haven't reached max retries, try again
                            if (retryCount < maxRetries) {
                                console.log(`Retrying in 5 seconds... (${retryCount + 1}/${maxRetries})`);
                                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
                                return createTunnel(retryCount + 1, maxRetries);
                            }

                            throw error;
                        }
                    };

                    try {
                        // Create tunnel with retry logic
                        const {url: tunnelUrl, tunnel} = await createTunnel();

                        // Only proceed with callback setup if we have a valid tunnel URL
                        if (tunnelUrl) {
                            // Send callback with the tunnel URL initially
                            if (config.CALLBACK_URL) {
                                try {
                                    await sendCallback(tunnelUrl, config);
                                    console.log(`Successfully sent initial callback to ${config.CALLBACK_URL}`);
                                } catch (callbackError) {
                                    console.error(`Failed to send initial callback: ${callbackError.message}`);
                                }
                            }

                            // Set up a periodic callback to ensure a tunnel is online
                            if (config.CALLBACK_URL && config.CALLBACK_INTERVAL > 0) {
                                console.log(`Setting up periodic callback every ${config.CALLBACK_INTERVAL / 1000} seconds`);
                                const intervalId = setInterval(() => {
                                    sendCallback(tunnelUrl, config).catch(error => {
                                        console.error(`Error in periodic callback: ${error.message}`);
                                    });
                                }, config.CALLBACK_INTERVAL);

                                // Clear interval when tunnel is closed
                                process.on('SIGINT', () => {
                                    clearInterval(intervalId);
                                });
                            }
                        } else {
                            console.warn('Cloudflare tunnel was created but no URL was returned. Callback setup skipped.');
                        }

                        // Handle tunnel closure
                        process.on('SIGINT', async () => {
                            console.log('Closing Cloudflare tunnel...');
                            try {
                                tunnel.stop();
                                console.log('Cloudflare tunnel closed successfully');
                            } catch (stopError) {
                                console.error(`Error closing Cloudflare tunnel: ${stopError.message}`);
                            }
                            process.exit(0);
                        });
                    } catch (error) {
                        console.error(`Failed to establish Cloudflare tunnel after multiple attempts: ${error.message}`);
                        console.log('Please check your Cloudflare token and network connectivity.');
                        console.log('If the problem persists, try the following:');
                        console.log('1. Verify your Cloudflare token is valid and has the necessary permissions');
                        console.log('2. Check your network connectivity and firewall settings');
                        console.log('3. Try running with a different token or configuration');
                    }
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
