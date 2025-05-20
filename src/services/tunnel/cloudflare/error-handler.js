/**
 * Cloudflare tunnel error handling utilities
 *
 * @module services/tunnel/cloudflare/error-handler
 */

/**
 * Check if an error is critical based on common error patterns
 *
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is critical, false otherwise
 */
function isCriticalError(error) {
    const criticalPatterns = [
        'connection refused',
        'permission denied',
        'invalid token',
        'authentication failed',
        'could not establish',
        'unable to connect',
        'EACCES',
        'EADDRINUSE',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'certificate has expired',
        'unable to verify the first certificate',
        'self signed certificate',
        'certificate is not trusted'
    ];

    return criticalPatterns.some(pattern =>
        error.message.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * Check if an error message contains any critical process errors
 * 
 * @param {string} errorMessage - The error message to check
 * @returns {boolean} True if the message contains critical errors, false otherwise
 */
function containsProcessCriticalError(errorMessage) {
    const criticalErrors = [
        'connection refused',
        'permission denied',
        'invalid token',
        'authentication failed',
        'could not establish',
        'unable to connect'
    ];

    return criticalErrors.some(msg =>
        errorMessage.toLowerCase().includes(msg)
    );
}

/**
 * Handle non-critical errors by returning a dummy tunnel object
 * 
 * @param {string} errorMessage - The error message
 * @returns {Object} A dummy tunnel object
 */
function handleNonCriticalError(errorMessage) {
    console.warn(`Non-critical tunnel issue: ${errorMessage}`);
    return {
        url: 'https://dummy-tunnel-url.trycloudflare.com',
        stop: () => console.log('Cloudflare tunnel closed')
    };
}

module.exports = {
    isCriticalError,
    containsProcessCriticalError,
    handleNonCriticalError
};