const asyncHandler = require("../utils/asyncHandler");
const heartRateService = require("../services/heart-rate.service");
const ApiError = require("../utils/ApiError");

// Validation d'une mesure de fréquence cardiaque
const validateHeartRateInput = (record) => {
    const errors = [];

    if (!record.timestamp) {
        errors.push({ field: "timestamp", msg: "timestamp is required" });
    } else {
        const recordTime = new Date(record.timestamp);
        if (isNaN(recordTime.getTime())) {
            errors.push({ field: "timestamp", msg: "timestamp must be a valid ISO datetime" });
        } else if (recordTime > new Date()) {
            errors.push({ field: "timestamp", msg: "timestamp cannot be in the future" });
        }
    }

    if (!record.bpm || typeof record.bpm !== "number") {
        errors.push({ field: "bpm", msg: "bpm is required and must be a number" });
    } else if (record.bpm < 30 || record.bpm > 250) {
        errors.push({ field: "bpm", msg: "bpm must be between 30 and 250" });
    }

    if (record.context) {
        const validContexts = ["rest", "exercise", "recovery", "sleep"];
        if (!validContexts.includes(record.context)) {
            errors.push({ field: "context", msg: `context must be one of: ${validContexts.join(", ")}` });
        }
    }

    if (record.activityId && !Number.isInteger(record.activityId)) {
        errors.push({ field: "activityId", msg: "activityId must be an integer" });
    }

    return errors;
};

// Validation des paramètres de liste
const validateListParams = (req) => {
    const errors = [];
    const { page, limit, context, dateFrom, dateTo } = req.query;

    if (page && (isNaN(page) || Number(page) < 1)) {
        errors.push({ field: "page", msg: "page must be a positive integer" });
    }

    if (limit && (isNaN(limit) || Number(limit) < 1 || Number(limit) > 500)) {
        errors.push({ field: "limit", msg: "limit must be between 1 and 500" });
    }

    if (context) {
        const validContexts = ["rest", "exercise", "recovery", "sleep"];
        if (!validContexts.includes(context)) {
            errors.push({ field: "context", msg: `context must be one of: ${validContexts.join(", ")}` });
        }
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
 * GET /api/heart-rate
 * Récupère la liste des mesures de fréquence cardiaque avec pagination
 */
exports.list = asyncHandler(async (req, res) => {
    const errors = validateListParams(req);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const { page = 1, limit = 50, context, dateFrom, dateTo } = req.query;
    const result = await heartRateService.getHeartRateRecords(req.user.userId, {
        page: Number(page),
        limit: Number(limit),
        context: context || null,
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
 * POST /api/heart-rate
 * Crée une mesure de fréquence cardiaque
 */
exports.create = asyncHandler(async (req, res) => {
    const errors = validateHeartRateInput(req.body);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const record = await heartRateService.createHeartRateRecord(req.user.userId, req.body);

    res.status(201).json({
        success: true,
        data: record,
    });
});

/**
 * POST /api/heart-rate/batch
 * Insère plusieurs mesures en une transaction atomique
 */
exports.batchCreate = asyncHandler(async (req, res) => {
    const { records } = req.body;

    if (!Array.isArray(records)) {
        throw new ApiError(400, "records must be an array");
    }

    const result = await heartRateService.batchInsertHeartRateRecords(req.user.userId, records);

    res.status(201).json({
        success: true,
        data: result.records,
        meta: {
            inserted: result.inserted,
        },
    });
});

/**
 * GET /api/heart-rate/stats
 * Récupère les statistiques de fréquence cardiaque
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

    const stats = await heartRateService.getHeartRateStats(req.user.userId, {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
    });

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * DELETE /api/heart-rate/:id
 * Supprime une mesure
 */
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid heart rate record ID");
    }

    const result = await heartRateService.deleteHeartRateRecord(Number(id), req.user.userId);

    res.status(200).json({
        success: true,
        data: result,
    });
});
