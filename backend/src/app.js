const express = require("express");
const cors = require("cors");

const { prometheusMiddleware, register } = require("./middlewares/prometheus.middleware");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const activitiesRoutes = require("./routes/activities");
const sleepRoutes = require("./routes/sleep");
const heartRateRoutes = require("./routes/heartRate");
const anomaliesRoutes = require("./routes/anomalies");
const analyticsRoutes = require("./routes/analytics");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(prometheusMiddleware);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api/heart-rate", heartRateRoutes);
app.use("/api/anomalies", anomaliesRoutes);
app.use("/api/analytics", analyticsRoutes);

// handler d'erreurs (toujours en dernier)
app.use(errorMiddleware);

module.exports = app;