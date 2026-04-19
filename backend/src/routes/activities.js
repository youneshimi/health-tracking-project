const router = require("express").Router();
const activityController = require("../controllers/activity.controller");
const requireAuth = require("../middlewares/auth.middleware");

/**
 * Toutes les routes d'activités sont protégées par JWT
 */
router.use(requireAuth);

/**
 * GET /api/activities/stats - Statistiques (AVANT les routes paramétrées)
 */
router.get("/stats", activityController.getStats);

/**
 * GET /api/activities - Lister les activités
 */
router.get("/", activityController.list);

/**
 * POST /api/activities - Créer une activité
 */
router.post("/", activityController.create);

/**
 * GET /api/activities/:id - Détails d'une activité
 */
router.get("/:id", activityController.getById);

/**
 * PUT /api/activities/:id - Modifier une activité
 */
router.put("/:id", activityController.update);

/**
 * DELETE /api/activities/:id - Supprimer une activité
 */
router.delete("/:id", activityController.delete);

module.exports = router;
