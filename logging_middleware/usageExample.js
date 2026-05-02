require('dotenv').config();
const { logEvent } = require('./logger');

async function demoLogging() {
  const token = process.env.EVALUATION_API_TOKEN || 'YOUR_BEARER_TOKEN';

  try {
    const result = await logEvent({
      stack: 'vehicle-maintenance-scheduler',
      level: 'info',
      packageName: 'vehicle-maintenance-scheduler',
      message: 'Scheduler service initialized successfully.',
      token,
    });
    console.log('Log API response:', result);
  } catch (error) {
    console.error('Logging demo failed:', error.message);
  }
}

if (require.main === module) {
  demoLogging();
}
