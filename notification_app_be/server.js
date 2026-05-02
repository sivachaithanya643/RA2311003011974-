console.log("🚀 Notification API Server starting...");

require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { selectTopNotifications } = require("./prioritySelector");
const { logEvent } = require("../logging_middleware/logger");

const app = express();
const port = 3000;

// In-memory storage for demo purposes
let notifications = [];
let users = new Set();

// Middleware
app.use(express.json());

// Helper function to validate notification data
function validateNotification(notification) {
  const required = ['userId', 'type', 'title', 'message'];
  for (const field of required) {
    if (!notification[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const validTypes = ['Placement', 'Result', 'Event'];
  if (!validTypes.includes(notification.type)) {
    throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
  }

  return true;
}

// POST /api/notifications - Create a new notification
app.post("/api/notifications", async (req, res) => {
  try {
    const notification = req.body;
    validateNotification(notification);

    const newNotification = {
      notificationId: uuidv4(),
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
      priority: notification.priority || 'normal',
      timestamp: new Date().toISOString(),
      read: false,
      archived: false,
      source: notification.source || 'api'
    };

    notifications.push(newNotification);
    users.add(notification.userId);

    // Log the notification creation
    await logEvent({
      stack: 'notification-system',
      level: 'info',
      packageName: 'notification-app-backend',
      message: `Created notification ${newNotification.notificationId} for user ${notification.userId}`,
      token: process.env.EVALUATION_API_TOKEN,
      baseUrl: process.env.EVALUATION_API_BASE_URL
    }).catch(() => {
      console.warn('[Notification] warning: unable to log notification creation.');
    });

    res.status(201).json({
      notificationId: newNotification.notificationId,
      status: "created"
    });
  } catch (error) {
    console.error("[Notification Error]", error.message);
    res.status(400).json({
      error: error.message
    });
  }
});

// GET /api/notifications - Fetch user notifications with filters and pagination
app.get("/api/notifications", (req, res) => {
  try {
    const { userId, unread, page = 1, pageSize = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required" });
    }

    let userNotifications = notifications.filter(n => n.userId === userId && !n.archived);

    if (unread === 'true') {
      userNotifications = userNotifications.filter(n => !n.read);
    }

    // Sort by timestamp (most recent first)
    userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

    res.json({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: userNotifications.length,
      notifications: paginatedNotifications
    });
  } catch (error) {
    console.error("[Notification Error]", error.message);
    res.status(500).json({
      error: "Unable to fetch notifications"
    });
  }
});

// PUT /api/notifications/{notificationId} - Update notification state
app.put("/api/notifications/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const updates = req.body;

    const notification = notifications.find(n => n.notificationId === notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Update allowed fields
    if (updates.read !== undefined) {
      notification.read = Boolean(updates.read);
    }
    if (updates.archived !== undefined) {
      notification.archived = Boolean(updates.archived);
    }

    notification.updated_at = new Date().toISOString();

    // Log the update
    await logEvent({
      stack: 'notification-system',
      level: 'info',
      packageName: 'notification-app-backend',
      message: `Updated notification ${notificationId} - read: ${notification.read}, archived: ${notification.archived}`,
      token: process.env.EVALUATION_API_TOKEN,
      baseUrl: process.env.EVALUATION_API_BASE_URL
    }).catch(() => {
      console.warn('[Notification] warning: unable to log notification update.');
    });

    res.json({
      notificationId,
      status: "updated"
    });
  } catch (error) {
    console.error("[Notification Error]", error.message);
    res.status(500).json({
      error: "Unable to update notification"
    });
  }
});

// GET /api/notifications/top - Return top notifications sorted by priority and recency
app.get("/api/notifications/top", (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required" });
    }

    const userNotifications = notifications.filter(n => n.userId === userId && !n.archived);
    const topNotifications = selectTopNotifications(userNotifications, parseInt(limit));

    res.json({
      notifications: topNotifications
    });
  } catch (error) {
    console.error("[Notification Error]", error.message);
    res.status(500).json({
      error: "Unable to fetch top notifications"
    });
  }
});

// GET /api/users - Get all users (for testing purposes)
app.get("/api/users", (req, res) => {
  res.json({
    users: Array.from(users)
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    totalNotifications: notifications.length,
    totalUsers: users.size
  });
});

app.listen(port, () => {
  console.log(`✅ Notification API Server running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});