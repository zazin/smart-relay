/**
 * Configuration settings for the HTTP proxy server
 *
 * @module config
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { runSetup, CONFIG_FILE } = require('./setup');

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.smart-relay');

// Default configuration
const DEFAULT_PORT = 8080;

// Ngrok configuration defaults
const DEFAULT_NGROK_ENABLED = false;
const DEFAULT_NGROK_TOKEN = '';
const DEFAULT_NGROK_REGION = 'us';

// Cloudflare tunnel configuration defaults
const DEFAULT_CLOUDFLARE_ENABLED = false;

// Callback configuration defaults
const DEFAULT_CALLBACK_URL = '';
const DEFAULT_CALLBACK_AUTH_HEADER = '';
const DEFAULT_CALLBACK_INTERVAL = 10000; // 10 seconds in milliseconds

// Content type constants
const CONTENT_TYPE_JSON = 'application/json';

// Ensure the config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    try {
        fs.mkdirSync(CONFIG_DIR, {recursive: true});
    } catch (err) {
        console.error(`Failed to create config directory: ${err.message}`);
    }
}

// Default configuration object
const defaultConfig = {
    PORT: DEFAULT_PORT,
    NGROK_ENABLED: DEFAULT_NGROK_ENABLED,
    NGROK_TOKEN: DEFAULT_NGROK_TOKEN,
    NGROK_REGION: DEFAULT_NGROK_REGION,
    CLOUDFLARE_ENABLED: DEFAULT_CLOUDFLARE_ENABLED,
    CALLBACK_URL: DEFAULT_CALLBACK_URL,
    CALLBACK_AUTH_HEADER: DEFAULT_CALLBACK_AUTH_HEADER,
    CALLBACK_INTERVAL: DEFAULT_CALLBACK_INTERVAL
};

// Read or create a config file
let configData = { ...defaultConfig };

// Check if this is the first run or config file doesn't exist
const isFirstRun = !fs.existsSync(CONFIG_FILE);

// Function to load configuration
async function loadConfig() {
    if (isFirstRun) {
        try {
            // Run interactive setup
            console.log('No configuration found. Starting interactive setup...');
            configData = await runSetup();
        } catch (err) {
            console.error(`Failed to run setup: ${err.message}`);
            // Fall back to default config
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            console.log(`Created default config file at ${CONFIG_FILE}`);
        }
    } else {
        try {
            const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
            configData = JSON.parse(fileContent);
        } catch (err) {
            console.error(`Failed to read config file: ${err.message}`);
        }
    }
}

/**
 * Get configuration values
 * @returns {Object} Configuration object with all settings
 */
async function getConfig() {
    // Load configuration if needed
    await loadConfig();

    // Determine PORT value from config file, environment variable, or default
    const PORT = process.env.PORT || configData.PORT || DEFAULT_PORT;

    // Determine ngrok settings from config file, environment variables, or defaults
    const NGROK_ENABLED = process.env.NGROK_ENABLED === 'true' || configData.NGROK_ENABLED || DEFAULT_NGROK_ENABLED;
    const NGROK_TOKEN = process.env.NGROK_TOKEN || configData.NGROK_TOKEN || DEFAULT_NGROK_TOKEN;
    const NGROK_REGION = process.env.NGROK_REGION || configData.NGROK_REGION || DEFAULT_NGROK_REGION;

    // Determine Cloudflare tunnel settings from config file, environment variables, or defaults
    const CLOUDFLARE_ENABLED = process.env.CLOUDFLARE_ENABLED === 'true' || configData.CLOUDFLARE_ENABLED || DEFAULT_CLOUDFLARE_ENABLED;

    // Determine callback settings from config file, environment variables, or defaults
    const CALLBACK_URL = process.env.CALLBACK_URL || configData.CALLBACK_URL || DEFAULT_CALLBACK_URL;
    const CALLBACK_AUTH_HEADER = process.env.CALLBACK_AUTH_HEADER || configData.CALLBACK_AUTH_HEADER || DEFAULT_CALLBACK_AUTH_HEADER;
    const CALLBACK_INTERVAL = parseInt(process.env.CALLBACK_INTERVAL) || configData.CALLBACK_INTERVAL || DEFAULT_CALLBACK_INTERVAL;

    return {
        PORT,
        CONTENT_TYPE_JSON,
        NGROK_ENABLED,
        NGROK_TOKEN,
        NGROK_REGION,
        CLOUDFLARE_ENABLED,
        CALLBACK_URL,
        CALLBACK_AUTH_HEADER,
        CALLBACK_INTERVAL
    };
}

module.exports = getConfig;
