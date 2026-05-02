const { fetchDepots, fetchVehicles } = require('./apiClient');
const { optimizeTasks } = require('./knapsack');
const { logEvent } = require('../logging_middleware/logger');

/**
 * Build a maintenance schedule using depot capacity and vehicle impact.
 *
 * @returns {Promise<Object>} schedule result
 */
async function buildMaintenanceSchedule() {
  const token = process.env.EVALUATION_API_TOKEN;
  const baseUrl = process.env.EVALUATION_API_BASE_URL || 'https://api.example.com';

  if (!token) {
    throw new Error('Environment variable EVALUATION_API_TOKEN is required.');
  }

  let depots, vehicles;

  try {
    depots = await fetchDepots(token, baseUrl);
    vehicles = await fetchVehicles(token, baseUrl);
  } catch (apiError) {
    console.warn('⚠️ API failed, using mock data:', apiError.message);

    // Fallback to mock data
    depots = [
      { id: 1, mechanicHours: 40 },
      { id: 2, mechanicHours: 35 },
      { id: 3, mechanicHours: 45 }
    ];

    vehicles = [
      { id: 1, impact: 15, duration: 8 },
      { id: 2, impact: 10, duration: 6 },
      { id: 3, impact: 20, duration: 12 },
      { id: 4, impact: 8, duration: 4 },
      { id: 5, impact: 25, duration: 15 },
      { id: 6, impact: 12, duration: 7 },
      { id: 7, impact: 18, duration: 10 },
      { id: 8, impact: 22, duration: 14 }
    ];
  }

  const totalMechanicHours = Array.isArray(depots)
    ? depots.reduce((sum, depot) => sum + (Number(depot.mechanicHours) || 0), 0)
    : 0;

  const optimized = optimizeTasks(vehicles, totalMechanicHours);

  await logEvent({
    stack: 'vehicle-maintenance-scheduler',
    level: 'info',
    packageName: 'vehicle-maintenance-scheduler',
    message: `Selected ${optimized.selectedTasks.length} vehicles from ${vehicles.length} candidates using ${totalMechanicHours} available mechanic hours.`,
    token,
    baseUrl,
  }).catch(() => {
    console.warn('[Scheduler] warning: unable to log schedule summary.');
  });

  return {
    selectedTasks: optimized.selectedTasks,
    totalImpact: optimized.totalImpact,
    totalDuration: optimized.totalDuration,
    availableMechanicHours: totalMechanicHours,
  };
}

module.exports = {
  buildMaintenanceSchedule,
};