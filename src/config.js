/**
 * Configuration settings for the HTTP proxy server
 *
 * @module config
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.smart-relay');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_PORT = 8080;

// Ngrok configuration defaults
const DEFAULT_NGROK_ENABLED = false;
const DEFAULT_NGROK_AUTHTOKEN = '';
const DEFAULT_NGROK_REGION = 'us';

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

// Read or create a config file
let configData = {
    PORT: DEFAULT_PORT,
    NGROK_ENABLED: DEFAULT_NGROK_ENABLED,
    NGROK_AUTHTOKEN: DEFAULT_NGROK_AUTHTOKEN,
    NGROK_REGION: DEFAULT_NGROK_REGION
};
if (!fs.existsSync(CONFIG_FILE)) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
        console.log(`Created default config file at ${CONFIG_FILE}`);
    } catch (err) {
        console.error(`Failed to create config file: ${err.message}`);
    }
} else {
    try {
        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        configData = JSON.parse(fileContent);
    } catch (err) {
        console.error(`Failed to read config file: ${err.message}`);
    }
}

// Determine PORT value from config file, environment variable, or default
const PORT = process.env.PORT || configData.PORT || DEFAULT_PORT;

// Determine ngrok settings from config file, environment variables, or defaults
const NGROK_ENABLED = process.env.NGROK_ENABLED === 'true' || configData.NGROK_ENABLED || DEFAULT_NGROK_ENABLED;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN || configData.NGROK_AUTHTOKEN || DEFAULT_NGROK_AUTHTOKEN;
const NGROK_REGION = process.env.NGROK_REGION || configData.NGROK_REGION || DEFAULT_NGROK_REGION;

module.exports = {
    PORT,
    CONTENT_TYPE_JSON,
    NGROK_ENABLED,
    NGROK_AUTHTOKEN,
    NGROK_REGION
};
