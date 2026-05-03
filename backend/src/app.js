const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const activitiesRoutes = require("./routes/activities");
const sleepRoutes = require("./routes/sleep");
const heartRateRoutes = require("./routes/heartRate");
const anomaliesRoutes = require("./routes/anomalies");
const analyticsRoutes = require("./routes/analytics");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

/**
 * Prometheus metrics
 */
client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

app.use((req, res, next) => {
    if (req.path === "/metrics") {
        return next();
    }

    const end = httpRequestDuration.startTimer();

    res.on("finish", () => {
        end({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode,
        });
    });

    next();
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/metrics", async (req, res, next) => {
    try {
        res.set("Content-Type", client.register.contentType);
        res.end(await client.register.metrics());
    } catch (error) {
        next(error);
    }
});

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