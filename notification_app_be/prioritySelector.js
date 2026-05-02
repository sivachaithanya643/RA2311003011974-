const PRIORITY_ORDER = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function getPriorityRank(type) {
  return PRIORITY_ORDER[type] || 0;
}

/**
 * Return the top notifications sorted by priority and recency.
 *
 * @param {Array<Object>} notifications
 * @param {number} [limit=10]
 * @returns {Array<Object>}
 */
function selectTopNotifications(notifications, limit = 10) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications
    .map((notification) => ({
      ...notification,
      priorityRank: getPriorityRank(notification.type),
      timestampMs: new Date(notification.timestamp).getTime(),
    }))
    .sort((a, b) => {
      if (b.priorityRank !== a.priorityRank) {
        return b.priorityRank - a.priorityRank;
      }
      return b.timestampMs - a.timestampMs;
    })
    .slice(0, limit)
    .map(({ priorityRank, timestampMs, ...rest }) => rest);
}

module.exports = {
  selectTopNotifications,
};
