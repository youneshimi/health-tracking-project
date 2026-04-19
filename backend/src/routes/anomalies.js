const router = require("express").Router();
const anomaliesController = require("../controllers/anomalies.controller");
const requireAuth = require("../middlewares/auth.middleware");

/**
 * Toutes les routes d'anomalies sont protégées par JWT
 */
router.use(requireAuth);

/**
 * GET /api/anomalies/summary - Résumé des anomalies non lues (AVANT les routes paramétrées)
 */
router.get("/summary", anomaliesController.getSummary);

/**
 * GET /api/anomalies - Lister les anomalies
 */
router.get("/", anomaliesController.list);

/**
 * PUT /api/anomalies/read-all - Marquer toutes les anomalies comme lues
 */
router.put("/read-all", anomaliesController.markAllAsRead);

/**
 * PUT /api/anomalies/:id/read - Marquer une anomalie comme lue
 */
router.put("/:id/read", anomaliesController.markAsRead);

module.exports = router;
