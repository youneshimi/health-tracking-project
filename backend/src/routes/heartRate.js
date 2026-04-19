const router = require("express").Router();
const heartRateController = require("../controllers/heart-rate.controller");
const requireAuth = require("../middlewares/auth.middleware");

/**
 * Toutes les routes de fréquence cardiaque sont protégées par JWT
 */
router.use(requireAuth);

/**
 * GET /api/heart-rate/stats - Statistiques (AVANT les routes paramétrées)
 */
router.get("/stats", heartRateController.getStats);

/**
 * POST /api/heart-rate/batch - Insertion batch (AVANT la route générale)
 */
router.post("/batch", heartRateController.batchCreate);

/**
 * GET /api/heart-rate - Lister les mesures
 */
router.get("/", heartRateController.list);

/**
 * POST /api/heart-rate - Créer une mesure
 */
router.post("/", heartRateController.create);

/**
 * DELETE /api/heart-rate/:id - Supprimer une mesure
 */
router.delete("/:id", heartRateController.delete);

module.exports = router;
