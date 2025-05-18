# HTTP Proxy Server

A simple HTTP proxy server that forwards requests to a destination specified in the 'x-destination-url' header. It
supports both HTTP and HTTPS protocols.

## Project Structure

The project has been modularized for better maintainability:

- `index.js` - Main entry point that sets up and starts the server
- `src/config.js` - Configuration settings for the server
- `src/utils.js` - Utility functions used across the application
- `src/error-handlers.js` - Functions for handling error scenarios
- `src/proxy.js` - Core proxy functionality for forwarding requests
- `src/request-handlers.js` - Request handling and routing

## Usage

1. Start the server:
   ```
   node index.js
   ```

2. The server will listen on port 8080 by default.

3. To use the proxy, make HTTP requests to the server with the `x-destination-url` header set to the target URL.

   Example using curl:
   ```
   curl -H "x-destination-url: https://example.com" http://localhost:8080/path
   ```

## Error Handling

The server handles various error scenarios:

- Missing destination URL header (Error code: 001)
- Proxy request failures (Error code: 002)

## Author

Nur Zazin