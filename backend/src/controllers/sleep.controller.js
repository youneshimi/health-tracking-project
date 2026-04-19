const asyncHandler = require("../utils/asyncHandler");
const sleepService = require("../services/sleep.service");
const ApiError = require("../utils/ApiError");

// Validation de l'enregistrement de sommeil
const validateSleepInput = (req) => {
    const errors = [];
    const { date, totalHours, deepSleepHours, lightSleepHours, remSleepHours, qualityScore } = req.body;

    if (!date) {
        errors.push({ field: "date", msg: "date is required" });
    } else {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            errors.push({ field: "date", msg: "date must be a valid ISO date" });
        }
    }

    if (!totalHours || typeof totalHours !== "number" || totalHours <= 0 || totalHours > 24) {
        errors.push({ field: "totalHours", msg: "totalHours is required and must be between 0 and 24" });
    }

    if (deepSleepHours !== undefined && (typeof deepSleepHours !== "number" || deepSleepHours < 0 || deepSleepHours > 24)) {
        errors.push({ field: "deepSleepHours", msg: "deepSleepHours must be between 0 and 24" });
    }

    if (lightSleepHours !== undefined && (typeof lightSleepHours !== "number" || lightSleepHours < 0 || lightSleepHours > 24)) {
        errors.push({ field: "lightSleepHours", msg: "lightSleepHours must be between 0 and 24" });
    }

    if (remSleepHours !== undefined && (typeof remSleepHours !== "number" || remSleepHours < 0 || remSleepHours > 24)) {
        errors.push({ field: "remSleepHours", msg: "remSleepHours must be between 0 and 24" });
    }

    if (qualityScore !== undefined && (typeof qualityScore !== "number" || qualityScore < 1 || qualityScore > 10)) {
        errors.push({ field: "qualityScore", msg: "qualityScore must be between 1 and 10" });
    }

    // Validation : totalHours = deep + light + rem
    if (totalHours && (deepSleepHours !== undefined || lightSleepHours !== undefined || remSleepHours !== undefined)) {
        const calculatedTotal = (deepSleepHours || 0) + (lightSleepHours || 0) + (remSleepHours || 0);
        if (Math.abs(totalHours - calculatedTotal) > 0.01) {
            errors.push({
                field: "totalHours",
                msg: `totalHours (${totalHours}) must equal sum of deep (${deepSleepHours || 0}) + light (${lightSleepHours || 0}) + rem (${remSleepHours || 0})`
            });
        }
    }

    return errors;
};

// Validation des paramètres de liste
const validateListParams = (req) => {
    const errors = [];
    const { page, limit, dateFrom, dateTo } = req.query;

    if (page && (isNaN(page) || Number(page) < 1)) {
        errors.push({ field: "page", msg: "page must be a positive integer" });
    }

    if (limit && (isNaN(limit) || Number(limit) < 1 || Number(limit) > 100)) {
        errors.push({ field: "limit", msg: "limit must be between 1 and 100" });
    }

    if (dateFrom) {
        const date = new Date(dateFrom);
        if (isNaN(date.getTime())) {
            errors.push({ field: "dateFrom", msg: "dateFrom must be a valid ISO date" });
        }
    }

    if (dateTo) {
        const date = new Date(dateTo);
        if (isNaN(date.getTime())) {
            errors.push({ field: "dateTo", msg: "dateTo must be a valid ISO date" });
        }
    }

    return errors;
};

/**
 * GET /api/sleep
 * Récupère la liste des enregistrements de sommeil avec pagination
 */
exports.list = asyncHandler(async (req, res) => {
    const errors = validateListParams(req);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const { page = 1, limit = 10, dateFrom, dateTo } = req.query;
    const result = await sleepService.getSleepRecords(req.user.userId, {
        page: Number(page),
        limit: Number(limit),
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
    });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * POST /api/sleep
 * Crée un nouvel enregistrement de sommeil
 */
exports.create = asyncHandler(async (req, res) => {
    const errors = validateSleepInput(req);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const record = await sleepService.createSleepRecord(req.user.userId, req.body);

    res.status(201).json({
        success: true,
        data: record,
    });
});

/**
 * GET /api/sleep/:id
 * Récupère les détails d'un enregistrement de sommeil
 */
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid sleep record ID");
    }

    const record = await sleepService.getSleepRecordById(Number(id), req.user.userId);

    res.status(200).json({
        success: true,
        data: record,
    });
});

/**
 * PUT /api/sleep/:id
 * Modifie un enregistrement de sommeil
 */
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid sleep record ID");
    }

    // Validation des champs à mettre à jour (optionnelle, on peut mettre à jour partiellement)
    const errors = validateSleepInput({ body: req.body });
    if (errors.length && Object.keys(req.body).length > 0) {
        // On ne retourne une erreur que si on a au moins une erreur et qu'il y a des données
        const filteredErrors = errors.filter(e => e.field in req.body);
        if (filteredErrors.length) {
            throw new ApiError(400, "Validation error", filteredErrors);
        }
    }

    const record = await sleepService.updateSleepRecord(Number(id), req.user.userId, req.body);

    res.status(200).json({
        success: true,
        data: record,
    });
});

/**
 * DELETE /api/sleep/:id
 * Supprime un enregistrement de sommeil
 */
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid sleep record ID");
    }

    const result = await sleepService.deleteSleepRecord(Number(id), req.user.userId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/sleep/stats
 * Récupère les statistiques de sommeil
 */
exports.getStats = asyncHandler(async (req, res) => {
    const { dateFrom, dateTo } = req.query;

    // Validation dates
    if (dateFrom) {
        const date = new Date(dateFrom);
        if (isNaN(date.getTime())) {
            throw new ApiError(400, "Validation error", [{ field: "dateFrom", msg: "dateFrom must be a valid ISO date" }]);
        }
    }

    if (dateTo) {
        const date = new Date(dateTo);
        if (isNaN(date.getTime())) {
            throw new ApiError(400, "Validation error", [{ field: "dateTo", msg: "dateTo must be a valid ISO date" }]);
        }
    }

    const stats = await sleepService.getSleepStats(req.user.userId, {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
    });

    res.status(200).json({
        success: true,
        data: stats,
    });
});
