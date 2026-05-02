# Notification System Design

## Stage 1: API Design

### REST Endpoints

1. `POST /api/notifications`
   - Create a new notification
   - Request body:
     {
       "userId": "student-123",
       "type": "Placement",
       "title": "Campus placement update",
       "message": "Your interview is scheduled for tomorrow.",
       "metadata": {
         "company": "Acme Corp",
         "role": "Software Engineer"
       },
       "priority": "high"
     }
   - Response:
     {
       "notificationId": "notif-789",
       "status": "created"
     }

2. `GET /api/notifications?userId=student-123&unread=true&page=1&pageSize=20`
   - Fetch user notifications with filters and pagination
   - Response:
     {
       "page": 1,
       "pageSize": 20,
       "total": 135,
       "notifications": [
         {
           "notificationId": "notif-789",
           "userId": "student-123",
           "type": "Placement",
           "title": "Campus placement update",
           "message": "Your interview is scheduled for tomorrow.",
           "timestamp": "2026-05-02T12:30:00Z",
           "read": false,
           "priority": "high"
         }
       ]
     }

3. `PUT /api/notifications/{notificationId}`
   - Update notification state, typically read/unread or archived.
   - Request body:
     {
       "read": true
     }
   - Response:
     {
       "notificationId": "notif-789",
       "status": "updated"
     }

4. `GET /api/notifications/top?userId=student-123&limit=10`
   - Return the top 10 notifications sorted by priority and recency.
   - Response:
     {
       "notifications": [ /* sorted list */ ]
     }

### Headers

- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `Accept: application/json`
- `X-Request-ID: <uuid>`

### Real-time notification approach

Use WebSocket or server-sent events (SSE) for live updates.

- Push new notifications to connected clients when an event is created.
- Use a fallback polling endpoint `GET /api/notifications/updates` for clients that cannot maintain sockets.
- Keep message payload small and include only the notification metadata and a `notificationId`.

Example WebSocket event:
    {
      "type": "notification.created",
      "data": {
        "notificationId": "notif-789",
        "userId": "student-123",
        "title": "Interview reminder",
        "timestamp": "2026-05-02T12:30:00Z"
      }
    }

## Stage 2: Database Design

### SQL or NoSQL?

For campus notification systems, start with **SQL** if:

- strong data integrity is needed
- relational queries are common across users, notifications, and campaigns
- history and auditability matter

Use **NoSQL** when:

- write volume is very high and schema flexibility is needed
- notification payloads vary greatly across types
- you plan fast fan-out for user-specific feeds

### Recommended choice

A SQL database is a strong fit for this design because the data model is predictable and user-centric.

### Schema design

#### notifications

- `notification_id` UUID PRIMARY KEY
- `user_id` VARCHAR(64) NOT NULL
- `type` VARCHAR(32) NOT NULL
- `title` VARCHAR(256) NOT NULL
- `message` TEXT NOT NULL
- `metadata` JSON NULL
- `priority` VARCHAR(16) NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `read` BOOLEAN NOT NULL DEFAULT false
- `archived` BOOLEAN NOT NULL DEFAULT false
- `source` VARCHAR(64) NULL

#### users

- `user_id` VARCHAR(64) PRIMARY KEY
- `name` VARCHAR(128)
- `email` VARCHAR(256)

### Scalability issues and solutions

- Large notification tables grow quickly. Use partitioning by `created_at` or `user_id`.
- Hot users may have many recent notifications. Shard by user range or use user-specific partitioning.
- If query load grows, offload read-heavy endpoints to a read replica or caching layer.

## Stage 3: Query Optimization

### Optimizing unread notification queries

Use a query that filters by user and read state, with proper ordering.

Example SQL:
    SELECT notification_id, type, title, message, created_at, priority
    FROM notifications
    WHERE user_id = $1
      AND read = false
      AND archived = false
    ORDER BY created_at DESC
    LIMIT $2;

### Indexing strategy

- `CREATE INDEX idx_notifications_userid_read_createdat ON notifications(user_id, read, created_at DESC);`
- `CREATE INDEX idx_notifications_userid_priority_createdat ON notifications(user_id, priority, created_at DESC);`

These indexes support fast unread fetches and top-notification sorting.

## Stage 4: Performance Improvements

### Caching (Redis)

- Cache the top notification list for each user: `user:{userId}:notifications:top`.
- Keep TTL short (30-60 seconds) and invalidate cache when a notification is created or updated.
- Cache unread counts separately in `user:{userId}:notifications:unreadCount`.

### Pagination

- Use `LIMIT`/`OFFSET` for small pages: `?page=1&pageSize=20`.
- Use keyset pagination for large result sets:
    WHERE created_at < :lastTimestamp AND user_id = :userId
    ORDER BY created_at DESC
- Return `nextCursor` instead of absolute page numbers when possible.

### Batching

- Batch notification insertions and updates.
- If one event generates many notifications, write in bulk instead of one row per request.
- When marking multiple notifications read, update with a single `WHERE notification_id IN (...)`.

## Stage 5: System Reliability

### Pseudo code using queues

Use a message broker like Kafka or RabbitMQ to decouple notification creation from delivery.

Producer flow:
    const event = {
      eventType: 'student.result.published',
      userId: 'student-123',
      payload: { score: 92, company: 'Acme' }
    };
    producer.send('notification-events', event);

Consumer flow:
    consumer.on('message', async (message) => {
      const event = JSON.parse(message.value);
      const notification = buildNotificationFromEvent(event);
      await db.insert(notification);
      await cache.invalidate(`user:${event.userId}:notifications:top`);
      await websocket.publish(event.userId, { type: 'notification.created', data: notification });
    });

### Retry mechanism

- Use broker retry semantics or a dead-letter queue for failed deliveries.
- For database writes, use an idempotent notification ID and retry safely.
- When pushing real-time events, retry 2-3 times before sending to a fallback store.

### Async processing

- Insert notifications asynchronously from the event pipeline.
- Separate read APIs from write pipelines.
- Use background workers for expensive tasks like email or SMS fallback deliveries.

## Stage 6: Priority System

### Sorting rules

- Priority order: `Placement > Result > Event`
- Within the same type, sort by recency.
- Return only the top 10 notifications.

### Working code for top 10 selection

    const PRIORITY_ORDER = {
      Placement: 3,
      Result: 2,
      Event: 1,
    };

    function selectTopNotifications(notifications, limit = 10) {
      return [...notifications]
        .map((notification) => ({
          ...notification,
          priorityRank: PRIORITY_ORDER[notification.type] || 0,
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

### Example selection output

    {
      "notifications": [
        {
          "notificationId": "notif-101",
          "type": "Placement",
          "title": "Interview scheduled",
          "timestamp": "2026-05-02T14:00:00Z",
          "read": false
        },
        {
          "notificationId": "notif-102",
          "type": "Result",
          "title": "Assessment result available",
          "timestamp": "2026-05-02T13:45:00Z",
          "read": false
        }
      ]
    }

---

## Summary

This design uses a modular API surface, a SQL-backed schema, caching for read-heavy workloads, queue-based reliability, and a clear priority sorting strategy for top notifications.
