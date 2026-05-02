/**
 * Solve the 0/1 knapsack problem for task selection.
 *
 * @param {Array<Object>} tasks - Items with duration and impact.
 * @param {number} maxHours - Total available capacity in hours.
 * @returns {Object}
 */
function optimizeTasks(tasks, maxHours) {
  const capacity = Math.max(0, Math.round(Number(maxHours) * 60));
  if (!Array.isArray(tasks) || tasks.length === 0 || capacity <= 0) {
    return {
      selectedTasks: [],
      totalImpact: 0,
      totalDuration: 0,
    };
  }

  const items = tasks.map((task, index) => {
    const durationHours = Number(task.duration ?? task.durationHours ?? 0);
    const impactScore = Number(task.impact ?? task.impactScore ?? 0);
    return {
      original: task,
      id: task.id || task.vehicleId || `vehicle-${index + 1}`,
      name: task.name || task.vehicleId || `Vehicle ${index + 1}`,
      durationHours,
      impactScore,
      weight: Math.max(0, Math.round(durationHours * 60)),
      value: impactScore,
    };
  });

  const itemCount = items.length;
  const dp = Array.from({ length: itemCount + 1 }, () => Array(capacity + 1).fill(0));
  const keep = Array.from({ length: itemCount }, () => Array(capacity + 1).fill(false));

  for (let i = 1; i <= itemCount; i += 1) {
    const item = items[i - 1];
    for (let w = 0; w <= capacity; w += 1) {
      if (item.weight > w) {
        dp[i][w] = dp[i - 1][w];
      } else {
        const skipValue = dp[i - 1][w];
        const takeValue = item.value + dp[i - 1][w - item.weight];
        if (takeValue > skipValue) {
          dp[i][w] = takeValue;
          keep[i - 1][w] = true;
        } else {
          dp[i][w] = skipValue;
        }
      }
    }
  }

  let remainingCapacity = capacity;
  const selectedTasks = [];

  for (let i = itemCount; i > 0; i -= 1) {
    if (keep[i - 1][remainingCapacity]) {
      const item = items[i - 1];
      selectedTasks.push({
        id: item.id,
        name: item.name,
        durationHours: item.durationHours,
        impactScore: item.impactScore,
        originalTask: item.original,
      });
      remainingCapacity -= item.weight;
    }
  }

  selectedTasks.reverse();
  const totalImpact = selectedTasks.reduce((sum, task) => sum + task.impactScore, 0);
  const totalDuration = selectedTasks.reduce((sum, task) => sum + task.durationHours, 0);

  return {
    selectedTasks,
    totalImpact,
    totalDuration,
  };
}

module.exports = {
  optimizeTasks,
};