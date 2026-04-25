const client = require("prom-client");

// Activation des métriques par défaut de Node.js (CPU, mémoire, event loop, GC, etc.)
client.collectDefaultMetrics({ timeout: 5000 });

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Durée des requêtes HTTP en secondes",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "Nombre total de requêtes HTTP",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestErrorsTotal = new client.Counter({
  name: "http_request_errors_total",
  help: "Nombre de requêtes HTTP en erreur (4xx/5xx)",
  labelNames: ["method", "route", "status_code"],
});

function prometheusMiddleware(req, res, next) {
  if (req.path === "/metrics") {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    const delta = process.hrtime(start);
    const durationSeconds = delta[0] + delta[1] / 1e9;

    httpRequestDurationSeconds.observe(labels, durationSeconds);
    httpRequestTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
  });

  next();
}

module.exports = {
  prometheusMiddleware,
  register: client.register,
};
