const asyncHandler = require("../utils/asyncHandler");
const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/anomalies
 * Récupère la liste des anomalies de l'utilisateur avec filtres
 */
exports.list = asyncHandler(async (req, res) => {
    const { isRead, severity, type } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Construction de la requête
    let whereClause = "WHERE user_id = ?";
    const params = [req.user.userId];

    if (isRead !== undefined && isRead !== "") {
        const isReadBool = isRead === "true";
        whereClause += " AND is_read = ?";
        params.push(isReadBool);
    }

    if (severity) {
        const validSeverities = ["low", "medium", "high"];
        if (!validSeverities.includes(severity)) {
            throw new ApiError(400, "Invalid severity. Must be: low, medium, high");
        }
        whereClause += " AND severity = ?";
        params.push(severity);
    }

    if (type) {
        const validTypes = ["heart_rate", "sleep", "activity"];
        if (!validTypes.includes(type)) {
            throw new ApiError(400, "Invalid type. Must be: heart_rate, sleep, activity");
        }
        whereClause += " AND type = ?";
        params.push(type);
    }

    // Récupérer les anomalies
    const [anomalies] = await pool.query(
        `SELECT anomaly_id, user_id, type, severity, detected_at, description, related_id, is_read, created_at
         FROM anomalies
         ${whereClause}
         ORDER BY detected_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Récupérer le total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM anomalies ${whereClause}`,
        params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
        success: true,
        data: anomalies,
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
    });
});

/**
 * GET /api/anomalies/summary
 * Récupère le résumé des anomalies non lues par severity
 */
exports.getSummary = asyncHandler(async (req, res) => {
    const [summary] = await pool.query(
        `SELECT 
            severity,
            COUNT(*) as count
         FROM anomalies
         WHERE user_id = ? AND is_read = FALSE
         GROUP BY severity`,
        [req.user.userId]
    );

    const result = {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    for (const row of summary) {
        result[row.severity] = row.count;
        result.total += row.count;
    }

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PUT /api/anomalies/:id/read
 * Marque une anomalie comme lue
 */
exports.markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        throw new ApiError(400, "Invalid anomaly ID");
    }

    // Vérifier que l'anomalie appartient à l'utilisateur
    const [anomaly] = await pool.query(
        `SELECT anomaly_id FROM anomalies WHERE anomaly_id = ? AND user_id = ?`,
        [Number(id), req.user.userId]
    );

    if (!anomaly.length) {
        throw new ApiError(404, "Anomaly not found");
    }

    // Mettre à jour
    const [result] = await pool.query(
        `UPDATE anomalies SET is_read = TRUE WHERE anomaly_id = ? AND user_id = ?`,
        [Number(id), req.user.userId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Anomaly not found");
    }

    // Récupérer l'anomalie mise à jour
    const [updated] = await pool.query(
        `SELECT anomaly_id, user_id, type, severity, detected_at, description, related_id, is_read, created_at
         FROM anomalies
         WHERE anomaly_id = ? AND user_id = ?`,
        [Number(id), req.user.userId]
    );

    res.status(200).json({
        success: true,
        data: updated[0],
    });
});

/**
 * PUT /api/anomalies/read-all
 * Marque toutes les anomalies comme lues
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
    const [result] = await pool.query(
        `UPDATE anomalies SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
        [req.user.userId]
    );

    res.status(200).json({
        success: true,
        data: {
            updated: result.affectedRows,
        },
    });
});
