# HTTP Proxy Server

A simple HTTP proxy server that forwards requests to a destination specified in the 'x-destination-url' header. It
supports both HTTP and HTTPS protocols.

## Installation

## Usage

### As a standalone server

1. Start the server:
   ```bash
   npx smart-relay
   ```

2. The server will listen on port `8080` by default.

3. To use the proxy, make HTTP requests to the server with the `x-destination-url` header set to the target URL.

   Example using curl:
   ```bash
   curl -H "x-destination-url: https://example.com" http://localhost:8080/path
   ```

## Error Handling

The server handles various error scenarios:

| Error scenario                 | Error code |
|--------------------------------|------------|
| Missing destination URL header | 001        |
| Proxy request failures         | 002        |

## Development

### Project Structure

The project has been modularized for better maintainability:

- `index.js` - Main entry point that sets up and starts the server
- `src/config.js` - Configuration settings for the server
- `src/utils.js` - Utility functions used across the application
- `src/error-handlers.js` - Functions for handling error scenarios
- `src/proxy.js` - Core proxy functionality for forwarding requests
- `src/request-handlers.js` - Request handling and routing
- `tests/` - Test files for the application

### Testing

Run the tests with:

```bash
npm test
```

### Publishing

This package uses GitHub Actions for automated deployment to npm. When a new release is created on GitHub, the package
will be automatically tested and published to npm.

To create a new release:

1. Update the version in package.json
2. Create a new release on GitHub

## Author

Nur Zazin
