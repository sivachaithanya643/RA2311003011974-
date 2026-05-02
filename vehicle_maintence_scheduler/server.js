console.log("🚀 Server file started");

require("dotenv").config();
const express = require("express");

const { buildMaintenanceSchedule } = require("./schedulerService");

const app = express(); // ✅ FIXED
const port = 4000;

app.get("/api/schedule", async (req, res) => {
  try {
    const schedule = await buildMaintenanceSchedule();
    res.json(schedule);
  } catch (error) {
    console.error("[Server Error]", error.message);

    res.status(500).json({
      error: "Unable to build schedule",
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}/api/schedule`);
});{
  "selectedTasks": [
    {"id": 1, "name": "Vehicle 1", "durationHours": 8, "impactScore": 15, ...}
    // ... optimized selection of vehicles
  ],
  "totalImpact": 130,
  "totalDuration": 76,
  "availableMechanicHours": 120
}{
  "selectedTasks": [
    {"id": 1, "name": "Vehicle 1", "durationHours": 8, "impactScore": 15, ...}
    // ... optimized selection of vehicles
  ],
  "totalImpact": 130,
  "totalDuration": 76,
  "availableMechanicHours": 120
}