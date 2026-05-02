const axios = require('axios');

/**
 * Send a structured log entry to the evaluation service.
 *
 * @param {Object} params
 * @param {string} params.stack - The stack or module that generated the log.
 * @param {string} params.level - Log level: info, warn, error.
 * @param {string} params.packageName - The package or service name.
 * @param {string} params.message - Human-readable log message.
 * @param {string} params.token - Bearer token for authentication.
 * @param {string} [params.baseUrl] - Optional base URL for the evaluation API.
 * @returns {Promise<Object>} The API response data.
 */
async function logEvent({ stack, level, packageName, message, token, baseUrl }) {
  if (!token) {
    throw new Error('Bearer token is required for logging. Set EVALUATION_API_TOKEN or pass token explicitly.');
  }

  if (!stack || !level || !packageName || !message) {
    throw new Error('stack, level, packageName, and message are required for logEvent.');
  }

  const apiBase = (baseUrl || process.env.EVALUATION_API_BASE_URL || 'https://api.example.com').replace(/\/+$/, '');
  const url = `${apiBase}/evaluation-service/logs`;
  const payload = {
    stack,
    level,
    package: packageName,
    message,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    console.error('[Logger] failed to send log:', error.message);
    if (error.response && error.response.data) {
      console.error('[Logger] response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  logEvent,
};
