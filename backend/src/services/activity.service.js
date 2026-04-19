const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Crée une nouvelle activité
 */
async function createActivity(userId, { activityType, durationMinutes, distanceKm, caloriesBurned, steps, avgHeartRate, maxHeartRate, notes }) {
    if (!activityType || !durationMinutes) {
        throw new ApiError(400, "Missing required fields: activityType, durationMinutes");
    }

    const [result] = await pool.query(
        `INSERT INTO activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, steps, avg_heart_rate, max_heart_rate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, activityType, durationMinutes, distanceKm || null, caloriesBurned || null, steps || null, avgHeartRate || null, maxHeartRate || null, notes || null]
    );

    return {
        activityId: result.insertId,
        userId,
        activityType,
        durationMinutes,
        distanceKm: distanceKm || null,
        caloriesBurned: caloriesBurned || null,
        steps: steps || null,
        avgHeartRate: avgHeartRate || null,
        maxHeartRate: maxHeartRate || null,
        notes: notes || null,
    };
}

/**
 * Récupère une activité par ID (avec vérification de propriété)
 */
async function getActivityById(activityId, userId) {
    const [rows] = await pool.query(
        `SELECT activity_id, user_id, activity_type, distance_km, duration_minutes, calories_burned, steps, avg_heart_rate, max_heart_rate, timestamp, notes
         FROM activities
         WHERE activity_id = ? AND user_id = ?
         LIMIT 1`,
        [activityId, userId]
    );

    if (!rows.length) {
        throw new ApiError(404, "Activity not found");
    }

    return rows[0];
}

/**
 * Récupère les activités de l'utilisateur avec pagination et filtres
 */
async function getActivities(userId, { page = 1, limit = 10, activityType, dateFrom, dateTo }) {
    const offset = (page - 1) * limit;

    // Construction de la requête avec filtres optionnels
    let whereClause = "WHERE user_id = ?";
    const params = [userId];

    if (activityType) {
        whereClause += " AND activity_type = ?";
        params.push(activityType);
    }

    if (dateFrom) {
        whereClause += " AND DATE(timestamp) >= ?";
        params.push(dateFrom);
    }

    if (dateTo) {
        whereClause += " AND DATE(timestamp) <= ?";
        params.push(dateTo);
    }

    // Requête pour les données
    const [activities] = await pool.query(
        `SELECT activity_id, user_id, activity_type, distance_km, duration_minutes, calories_burned, steps, avg_heart_rate, max_heart_rate, timestamp, notes
         FROM activities
         ${whereClause}
         ORDER BY timestamp DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Requête pour le total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM activities ${whereClause}`,
        params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
        data: activities,
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
    };
}

/**
 * Met à jour une activité (avec vérification de propriété)
 */
async function updateActivity(activityId, userId, updates) {
    // Vérifier que l'activité appartient à l'utilisateur
    const [existing] = await pool.query(
        `SELECT activity_id FROM activities WHERE activity_id = ? AND user_id = ?`,
        [activityId, userId]
    );

    if (!existing.length) {
        throw new ApiError(404, "Activity not found");
    }

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = ["activityType", "durationMinutes", "distanceKm", "caloriesBurned", "steps", "avgHeartRate", "maxHeartRate", "notes"];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
        if (field in updates) {
            const dbField = field === "activityType" ? "activity_type"
                : field === "durationMinutes" ? "duration_minutes"
                    : field === "distanceKm" ? "distance_km"
                        : field === "caloriesBurned" ? "calories_burned"
                            : field === "avgHeartRate" ? "avg_heart_rate"
                                : field === "maxHeartRate" ? "max_heart_rate"
                                    : field;
            updateFields.push(`${dbField} = ?`);
            updateValues.push(updates[field]);
        }
    }

    if (updateFields.length === 0) {
        throw new ApiError(400, "No valid fields to update");
    }

    updateValues.push(activityId, userId);

    const [result] = await pool.query(
        `UPDATE activities SET ${updateFields.join(", ")} WHERE activity_id = ? AND user_id = ?`,
        updateValues
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Activity not found");
    }

    // Retourner l'activité mise à jour
    const [rows] = await pool.query(
        `SELECT activity_id, user_id, activity_type, distance_km, duration_minutes, calories_burned, steps, avg_heart_rate, max_heart_rate, timestamp, notes
         FROM activities
         WHERE activity_id = ? AND user_id = ?`,
        [activityId, userId]
    );

    return rows[0];
}

/**
 * Supprime une activité (avec vérification de propriété)
 */
async function deleteActivity(activityId, userId) {
    const [result] = await pool.query(
        `DELETE FROM activities WHERE activity_id = ? AND user_id = ?`,
        [activityId, userId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Activity not found");
    }

    return { activityId, deleted: true };
}

/**
 * Récupère les statistiques d'activité de l'utilisateur
 */
async function getActivityStats(userId, { dateFrom, dateTo } = {}) {
    let whereClause = "WHERE user_id = ?";
    const params = [userId];

    if (dateFrom) {
        whereClause += " AND DATE(timestamp) >= ?";
        params.push(dateFrom);
    }

    if (dateTo) {
        whereClause += " AND DATE(timestamp) <= ?";
        params.push(dateTo);
    }

    // Stats globales
    const [globalStats] = await pool.query(
        `SELECT 
            COUNT(*) as totalActivities,
            SUM(calories_burned) as totalCalories,
            SUM(distance_km) as totalDistance,
            SUM(duration_minutes) as totalDuration,
            AVG(duration_minutes) as avgDuration,
            AVG(avg_heart_rate) as avgHeartRate,
            MAX(max_heart_rate) as maxHeartRate
         FROM activities
         ${whereClause}`,
        params
    );

    // Répartition par type
    const [byType] = await pool.query(
        `SELECT 
            activity_type as type,
            COUNT(*) as count,
            SUM(calories_burned) as totalCalories,
            SUM(distance_km) as totalDistance,
            SUM(duration_minutes) as totalDuration,
            AVG(duration_minutes) as avgDuration
         FROM activities
         ${whereClause}
         GROUP BY activity_type
         ORDER BY count DESC`,
        params
    );

    return {
        overall: globalStats[0],
        byType,
        dateRange: { from: dateFrom || null, to: dateTo || null },
    };
}

module.exports = {
    createActivity,
    getActivityById,
    getActivities,
    updateActivity,
    deleteActivity,
    getActivityStats,
};
