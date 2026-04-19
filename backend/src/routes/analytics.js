const router = require("express").Router();
const analyticsController = require("../controllers/analytics.controller");
const requireAuth = require("../middlewares/auth.middleware");

/**
 * Toutes les routes d'analytics sont protégées par JWT
 */
router.use(requireAuth);

/**
 * GET /api/analytics/trends
 * Récupère les données de tendance avec régression linéaire
 * Query params: metric (sleep_quality|resting_hr|weekly_activity_minutes|calories), period (7|30|90)
 */
router.get("/trends", analyticsController.getTrends);

/**
 * GET /api/analytics/predictions
 * Prédit les valeurs futures basées sur la régression des 30 derniers jours
 */
router.get("/predictions", analyticsController.getPredictions);

/**
 * GET /api/analytics/correlations
 * Analyse les corrélations entre métriques
 */
router.get("/correlations", analyticsController.getCorrelations);

/**
 * GET /api/analytics/weekly-summary
 * Résumé de la semaine courante vs semaine précédente
 */
router.get("/weekly-summary", analyticsController.getWeeklySummary);

module.exports = router;
