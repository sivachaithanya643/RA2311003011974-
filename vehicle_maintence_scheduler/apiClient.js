const axios = require('axios');

const DEFAULT_BASE_URL = process.env.EVALUATION_API_BASE_URL || 'http://20.244.56.144';

async function fetchResource(path, token = process.env.EVALUATION_API_TOKEN, baseUrl = DEFAULT_BASE_URL) {
  if (!token) {
    throw new Error('EVALUATION_API_TOKEN is missing');
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000, // Increased timeout to 15 seconds
    });

    return response.data;
  } catch (error) {
    const remoteMessage = error.response?.data?.message || error.response?.data || error.message;
    console.error('API Error:', remoteMessage);
    throw new Error(`Unable to fetch ${path}: ${remoteMessage}`);
  }
}

async function fetchDepots(token, baseUrl) {
  return fetchResource('/evaluation-service/depots', token, baseUrl);
}

async function fetchVehicles(token, baseUrl) {
  return fetchResource('/evaluation-service/vehicles', token, baseUrl);
}

module.exports = {
  fetchDepots,
  fetchVehicles,
};
