/**
 * Winston logger configuration
 * 
 * @module logger
 */

const winston = require('winston');

// Define the custom format for the logger
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  // Pad the level to ensure consistent spacing
  const paddedLevel = level.toUpperCase().padEnd(5);
  return `${timestamp} [${paddedLevel}] ${message}`;
});

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Export the logger functions
module.exports = {
  debug: (message) => logger.debug(message),
  info: (message) => logger.info(message),
  error: (message) => logger.error(message)
};