const router = require("express").Router();
const sleepController = require("../controllers/sleep.controller");
const requireAuth = require("../middlewares/auth.middleware");

/**
 * Toutes les routes de sommeil sont protégées par JWT
 */
router.use(requireAuth);

/**
 * GET /api/sleep/stats - Statistiques (AVANT les routes paramétrées)
 */
router.get("/stats", sleepController.getStats);

/**
 * GET /api/sleep - Lister les enregistrements de sommeil
 */
router.get("/", sleepController.list);

/**
 * POST /api/sleep - Créer un enregistrement
 */
router.post("/", sleepController.create);

/**
 * GET /api/sleep/:id - Détails d'un enregistrement
 */
router.get("/:id", sleepController.getById);

/**
 * PUT /api/sleep/:id - Modifier un enregistrement
 */
router.put("/:id", sleepController.update);

/**
 * DELETE /api/sleep/:id - Supprimer un enregistrement
 */
router.delete("/:id", sleepController.delete);

module.exports = router;
