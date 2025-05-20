/**
 * Interactive setup for the HTTP proxy server
 *
 * This module provides an interactive command-line interface for configuring
 * the proxy server when it's run for the first time or when the config file
 * doesn't exist.
 *
 * @module setup
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.smart-relay');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_PORT = 8080;

/**
 * Create a readline interface for user input
 * @returns {readline.Interface} The readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask a yes/no question
 * @param {readline.Interface} rl - The readline interface
 * @param {string} question - The question to ask
 * @returns {Promise<boolean>} The user's response (true for yes, false for no)
 */
async function askYesNo(rl, question) {
  while (true) {
    const answer = await new Promise(resolve => {
      rl.question(`${question} (y/n): `, resolve);
    });
    
    const normalized = answer.trim().toLowerCase();
    if (normalized === 'y' || normalized === 'yes') {
      return true;
    } else if (normalized === 'n' || normalized === 'no') {
      return false;
    }
    
    console.log('Please enter "y" or "n".');
  }
}

/**
 * Ask for a number input
 * @param {readline.Interface} rl - The readline interface
 * @param {string} question - The question to ask
 * @param {number} defaultValue - The default value
 * @returns {Promise<number>} The user's input as a number
 */
async function askNumber(rl, question, defaultValue) {
  while (true) {
    const answer = await new Promise(resolve => {
      rl.question(`${question} [${defaultValue}]: `, resolve);
    });
    
    if (answer.trim() === '') {
      return defaultValue;
    }
    
    const num = Number(answer);
    if (!isNaN(num)) {
      return num;
    }
    
    console.log('Please enter a valid number.');
  }
}

/**
 * Ask for a URL input
 * @param {readline.Interface} rl - The readline interface
 * @param {string} question - The question to ask
 * @returns {Promise<string>} The user's input as a URL string
 */
async function askUrl(rl, question) {
  while (true) {
    const answer = await new Promise(resolve => {
      rl.question(`${question}: `, resolve);
    });
    
    if (answer.trim() === '') {
      return '';
    }
    
    // Simple URL validation
    try {
      new URL(answer);
      return answer;
    } catch (e) {
      console.log('Please enter a valid URL (e.g., https://example.com).');
    }
  }
}

/**
 * Ask for a text input
 * @param {readline.Interface} rl - The readline interface
 * @param {string} question - The question to ask
 * @param {string} defaultValue - The default value
 * @returns {Promise<string>} The user's input as a string
 */
async function askText(rl, question, defaultValue = '') {
  const defaultPrompt = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await new Promise(resolve => {
    rl.question(`${question}${defaultPrompt}: `, resolve);
  });
  
  return answer.trim() === '' ? defaultValue : answer;
}

/**
 * Ask for tunnel configuration
 * @param {readline.Interface} rl - The readline interface
 * @returns {Promise<Object>} The tunnel configuration
 */
async function askTunnelConfig(rl) {
  const config = {
    NGROK_ENABLED: false,
    NGROK_TOKEN: '',
    NGROK_REGION: 'us',
    CLOUDFLARE_ENABLED: false,
    CLOUDFLARE_TOKEN: '',
    CLOUDFLARE_HOSTNAME: '',
    CALLBACK_URL: '',
    CALLBACK_AUTH_HEADER: ''
  };
  
  const enableTunnel = await askYesNo(rl, 'Do you want to enable tunnel?');
  
  if (enableTunnel) {
    console.log('\nChoose tunnel type:');
    console.log('1. Ngrok');
    console.log('2. Cloudflare');
    
    let tunnelChoice;
    while (true) {
      const answer = await askText(rl, 'Enter your choice (1 or 2)');
      if (answer === '1' || answer === '2') {
        tunnelChoice = answer;
        break;
      }
      console.log('Please enter 1 or 2.');
    }
    
    if (tunnelChoice === '1') {
      // Ngrok configuration
      config.NGROK_ENABLED = true;
      config.NGROK_TOKEN = await askText(rl, 'Enter your Ngrok authtoken (leave empty for unauthenticated tunnel)');
      config.NGROK_REGION = await askText(rl, 'Enter Ngrok region', 'us');
    } else {
      // Cloudflare configuration
      config.CLOUDFLARE_ENABLED = true;
      config.CLOUDFLARE_TOKEN = await askText(rl, 'Enter your Cloudflare token (required)');
      
      while (!config.CLOUDFLARE_TOKEN) {
        console.log('Cloudflare token is required for creating a tunnel.');
        config.CLOUDFLARE_TOKEN = await askText(rl, 'Enter your Cloudflare token (required)');
      }
      
      config.CLOUDFLARE_HOSTNAME = await askText(rl, 'Enter your Cloudflare hostname (e.g., your-hostname.example.com)');
    }
    
    // Callback URL configuration
    const enableCallback = await askYesNo(rl, 'Do you want to set callback URL?');
    if (enableCallback) {
      config.CALLBACK_URL = await askUrl(rl, 'Enter callback URL (e.g., https://your-api.example.com/webhook)');
      
      const enableAuthHeader = await askYesNo(rl, 'Do you want to set header auth on callback URL?');
      if (enableAuthHeader) {
        config.CALLBACK_AUTH_HEADER = await askText(rl, 'Enter auth header (e.g., Bearer your-token)');
      }
    }
  }
  
  return config;
}

/**
 * Run the interactive setup
 * @returns {Promise<Object>} The configuration object
 */
async function runSetup() {
  console.log('Welcome to Smart Relay setup!');
  console.log('This will help you configure the proxy server for first-time use.\n');
  
  const rl = createInterface();
  
  try {
    // Ask for port
    const port = await askNumber(rl, 'Enter the port number for the proxy server', DEFAULT_PORT);
    
    // Ask for tunnel configuration
    const tunnelConfig = await askTunnelConfig(rl);
    
    // Combine configurations
    const config = {
      PORT: port,
      ...tunnelConfig
    };
    
    // Ensure the config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Write the config file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`\nConfiguration saved to ${CONFIG_FILE}`);
    
    return config;
  } finally {
    rl.close();
  }
}

module.exports = {
  runSetup,
  CONFIG_FILE
};