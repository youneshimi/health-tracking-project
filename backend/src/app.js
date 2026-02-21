const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

// handler d'erreurs (toujours en dernier)
app.use(errorMiddleware);

module.exports = app;