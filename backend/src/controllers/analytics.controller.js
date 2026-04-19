const asyncHandler = require("../utils/asyncHandler");
const analyticsService = require("../services/analytics.service");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/analytics/trends
 * Récupère les données de tendance avec régression linéaire
 */
exports.getTrends = asyncHandler(async (req, res) => {
    const { metric, period } = req.query;

    if (!metric) {
        throw new ApiError(400, "metric parameter is required (sleep_quality | resting_hr | weekly_activity_minutes | calories)");
    }

    const validMetrics = ["sleep_quality", "resting_hr", "weekly_activity_minutes", "calories"];
    if (!validMetrics.includes(metric)) {
        throw new ApiError(400, `Invalid metric. Must be one of: ${validMetrics.join(", ")}`);
    }

    const periodInt = period ? parseInt(period) : 30;
    if (![7, 30, 90].includes(periodInt)) {
        throw new ApiError(400, "period must be 7, 30, or 90 days");
    }

    const trends = await analyticsService.getTrends(req.user.userId, metric, periodInt);

    res.status(200).json({
        success: true,
        data: trends,
    });
});

/**
 * GET /api/analytics/predictions
 * Prédit les valeurs à J+7 et J+30
 */
exports.getPredictions = asyncHandler(async (req, res) => {
    const predictions = await analyticsService.getPredictions(req.user.userId);

    res.status(200).json({
        success: true,
        data: predictions,
    });
});

/**
 * GET /api/analytics/correlations
 * Analyse les corrélations entre métriques
 */
exports.getCorrelations = asyncHandler(async (req, res) => {
    const correlations = await analyticsService.getCorrelations(req.user.userId);

    res.status(200).json({
        success: true,
        data: correlations,
    });
});

/**
 * GET /api/analytics/weekly-summary
 * Résumé de la semaine courante vs semaine précédente
 */
exports.getWeeklySummary = asyncHandler(async (req, res) => {
    const summary = await analyticsService.getWeeklySummary(req.user.userId);

    res.status(200).json({
        success: true,
        data: summary,
    });
});
