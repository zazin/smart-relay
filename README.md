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

### Using Ngrok for Public Access

The server can automatically create an ngrok tunnel to expose your local server to the internet.

**Prerequisites:**
- You must have the `ngrok` CLI tool installed on your system. You can download it from the [ngrok website](https://ngrok.com/download).
- The `ngrok` command must be available in your system's PATH.

1. Enable ngrok in the configuration file at `~/.smart-relay/config.json`:
   ```json
   {
     "PORT": 8080,
     "NGROK_ENABLED": true,
     "NGROK_TOKEN": "your-ngrok-token",
     "NGROK_REGION": "us"
   }
   ```

2. Or use environment variables:
   ```bash
   NGROK_ENABLED=true NGROK_TOKEN=your-ngrok-authtoken npx smart-relay
   ```

3. When the server starts with ngrok enabled, it will display the public URL that can be used to access your proxy
   server from anywhere.

Note: While an authtoken is not strictly required, ngrok has limitations for unauthenticated tunnels. Get your free
authtoken by signing up at [ngrok.com](https://ngrok.com/).

### Using Cloudflare Tunnel for Public Access

The server can also create a Cloudflare tunnel to expose your local server to the internet.

**Prerequisites:**
- You must have the `cloudflared` CLI tool installed on your system. You can download it from the [Cloudflare website](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
- The `cloudflared` command must be available in your system's PATH.

**Note:** The server will automatically check if a tunnel named "smart-relay" exists. If it doesn't exist, it will create it (this is a one-time operation). If the tunnel already exists, it will skip the creation step and directly run the tunnel.

1. Enable Cloudflare tunnel in the configuration file at `~/.smart-relay/config.json`:
   ```json
   {
     "PORT": 8080,
     "CLOUDFLARE_ENABLED": true
   }
   ```

2. Or use environment variables:
   ```bash
   CLOUDFLARE_ENABLED=true npx smart-relay
   ```

3. When the server starts with Cloudflare tunnel enabled, it will display the public URL that can be used to access your
   proxy server from anywhere.

Note: You need to have Cloudflare CLI installed and authenticated to use this feature.

### Using Callback URL for Tunnel Notification

The server can notify an external service when a tunnel URL is available by sending a POST request to a specified
callback URL. This is useful for integrating with other systems that need to know the public URL of your tunnel.

1. Configure the callback URL and optional authentication header in the configuration file at
   `~/.smart-relay/config.json`:
   ```json
   {
     "PORT": 8080,
     "NGROK_ENABLED": true,
     "CALLBACK_URL": "https://your-api.example.com/webhook",
     "CALLBACK_AUTH_HEADER": "Bearer your-auth-token",
     "CALLBACK_INTERVAL": 10000
   }
   ```

2. Or use environment variables:
   ```bash
   NGROK_ENABLED=true CALLBACK_URL=https://your-api.example.com/webhook CALLBACK_AUTH_HEADER="Bearer your-auth-token" CALLBACK_INTERVAL=10000 npx smart-relay
   ```

3. When a tunnel is established (either ngrok or Cloudflare), the server will send a POST request to the callback URL
   with the tunnel URL in JSON format:
   ```json
   {
     "tunnelUrl": "https://your-tunnel-url.ngrok.io"
   }
   ```

4. The server will continue to send this request periodically (every 10 seconds by default) to ensure the tunnel is online.
   You can customize the interval by setting the `CALLBACK_INTERVAL` parameter (in milliseconds).

Note: This feature is designed to notify an external service about the public tunnel URL and to keep the tunnel active
by making regular calls to the external API.

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
- `src/config.js` - Configuration settings for the server, including ngrok options
- `src/utils.js` - Utility functions used across the application
- `src/error-handlers.js` - Functions for handling error scenarios
- `src/proxy.js` - Core proxy functionality for forwarding requests
- `src/request-handlers.js` - Request handling and routing
- `tests/` - Test files for the application

The server now includes ngrok integration for exposing your local server to the internet, making it easier to test
webhooks and share your proxy with others.

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

If you find this project helpful, you can support the author by making a donation:
[Ko-fi](https://ko-fi.com/zazin)
