const asyncHandler = require("../utils/asyncHandler");
const activityService = require("../services/activity.service");
const anomalyDetector = require("../services/anomalyDetector");
const ApiError = require("../utils/ApiError");

// Validation de l'activité
const validateActivityInput = (req) => {
    const errors = [];
    const { activityType, durationMinutes, distanceKm, caloriesBurned, steps, avgHeartRate, maxHeartRate } = req.body;

    if (!activityType) {
        errors.push({ field: "activityType", msg: "activityType is required" });
    } else {
        const validTypes = ["running", "walking", "cycling", "gym", "swimming", "yoga", "other"];
        if (!validTypes.includes(activityType)) {
            errors.push({ field: "activityType", msg: `activityType must be one of: ${validTypes.join(", ")}` });
        }
    }

    if (!durationMinutes || typeof durationMinutes !== "number" || durationMinutes <= 0) {
        errors.push({ field: "durationMinutes", msg: "durationMinutes is required and must be > 0" });
    }

    if (distanceKm !== undefined && (typeof distanceKm !== "number" || distanceKm < 0)) {
        errors.push({ field: "distanceKm", msg: "distanceKm must be a positive number" });
    }

    if (caloriesBurned !== undefined && (typeof caloriesBurned !== "number" || caloriesBurned < 0)) {
        errors.push({ field: "caloriesBurned", msg: "caloriesBurned must be a positive number" });
    }

    if (steps !== undefined && (typeof steps !== "number" || steps < 0)) {
        errors.push({ field: "steps", msg: "steps must be a positive number" });
    }

    if (avgHeartRate !== undefined && (typeof avgHeartRate !== "number" || avgHeartRate <= 0 || avgHeartRate >= 250)) {
        errors.push({ field: "avgHeartRate", msg: "avgHeartRate must be between 0 and 250" });
    }

    if (maxHeartRate !== undefined && (typeof maxHeartRate !== "number" || maxHeartRate <= 0 || maxHeartRate >= 250)) {
        errors.push({ field: "maxHeartRate", msg: "maxHeartRate must be between 0 and 250" });
    }

    return errors;
};

// Validation des paramètres de liste
const validateListParams = (req) => {
    const errors = [];
    const { page, limit, activityType, dateFrom, dateTo } = req.query;

    if (page && (isNaN(page) || Number(page) < 1)) {
        errors.push({ field: "page", msg: "page must be a positive integer" });
    }

    if (limit && (isNaN(limit) || Number(limit) < 1 || Number(limit) > 100)) {
        errors.push({ field: "limit", msg: "limit must be between 1 and 100" });
    }

    if (activityType) {
        const validTypes = ["running", "walking", "cycling", "gym", "swimming", "yoga", "other"];
        if (!validTypes.includes(activityType)) {
            errors.push({ field: "activityType", msg: `activityType must be one of: ${validTypes.join(", ")}` });
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
 * GET /api/activities
 * Récupère la liste des activités de l'utilisateur avec pagination
 */
exports.list = asyncHandler(async (req, res) => {
    const errors = validateListParams(req);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const { page = 1, limit = 10, activityType, dateFrom, dateTo } = req.query;
    const result = await activityService.getActivities(req.user.userId, {
        page: Number(page),
        limit: Number(limit),
        activityType: activityType || null,
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
 * POST /api/activities
 * Crée une nouvelle activité
 */
exports.create = asyncHandler(async (req, res) => {
    const errors = validateActivityInput(req);
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const activity = await activityService.createActivity(req.user.userId, req.body);

    // Lancer la détection d'anomalies en arrière-plan (non-bloquant)
    anomalyDetector.runFullDetection(req.user.userId).catch(err => {
        console.error("Error running anomaly detection:", err);
    });

    res.status(201).json({
        success: true,
        data: activity,
    });
});

/**
 * GET /api/activities/:id
 * Récupère les détails d'une activité
 */
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid activity ID");
    }

    const activity = await activityService.getActivityById(Number(id), req.user.userId);

    res.status(200).json({
        success: true,
        data: activity,
    });
});

/**
 * PUT /api/activities/:id
 * Modifie une activité
 */
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid activity ID");
    }

    // Validation des champs à mettre à jour
    const errors = validateActivityInput({ body: req.body });
    if (errors.length) {
        throw new ApiError(400, "Validation error", errors);
    }

    const activity = await activityService.updateActivity(Number(id), req.user.userId, req.body);

    res.status(200).json({
        success: true,
        data: activity,
    });
});

/**
 * DELETE /api/activities/:id
 * Supprime une activité
 */
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid activity ID");
    }

    const result = await activityService.deleteActivity(Number(id), req.user.userId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/activities/stats
 * Récupère les statistiques d'activité
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

    const stats = await activityService.getActivityStats(req.user.userId, {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
    });

    res.status(200).json({
        success: true,
        data: stats,
    });
});
