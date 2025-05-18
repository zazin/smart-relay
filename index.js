const http = require('http');
const https = require('https');
const url = require('url');

// Create the proxy server
const server = http.createServer((req, res) => {
    const destinationUrl = req.headers['x-destination-url'];

    if (!destinationUrl) {
        // Log requests with missing X-Destination-URL header
        console.log(`400 | (Missing X-Destination-URL header) | ${req.method} | /`);

        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('X-Destination-URL header is required.');
    }

    // Parse the destination URL
    const parsedDestinationUrl = url.parse(destinationUrl);

    // Determine the protocol
    const protocol = parsedDestinationUrl.protocol === 'https:' ? https : http;

    // Append the original request path to the destination URL's path
    const options = {
        hostname: parsedDestinationUrl.hostname,
        port: parsedDestinationUrl.port || (protocol === https ? 443 : 80),
        path: url.resolve(parsedDestinationUrl.path, req.url), // Combine the destination path with the incoming request path
        method: req.method,
        headers: {
            ...req.headers,
            'Host': parsedDestinationUrl.hostname // Override the Host header
        }
    };

    // Remove the proxy-specific headers
    delete options.headers['x-destination-url'];

    // Forward the request to the destination server
    const proxyReq = protocol.request(options, (proxyRes) => {
        // Log request details: method, full URL, status code
        const fullUrl = `${parsedDestinationUrl.protocol}//${parsedDestinationUrl.hostname}${options.path}`;
        console.log(`${proxyRes.statusCode} | OK | ${req.method} | ${fullUrl}`);

        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        // Log error requests with 500 status codes
        const fullUrl = `${parsedDestinationUrl.protocol}//${parsedDestinationUrl.hostname}${options.path}`;
        console.log(`500 (Error: ${err.message}) | ${req.method} | ${fullUrl}`);

        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy request failed: ${err.message}`);
    });

    req.pipe(proxyReq, { end: true });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
