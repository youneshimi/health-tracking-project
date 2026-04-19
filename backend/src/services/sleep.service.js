const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Crée un nouvel enregistrement de sommeil
 */
async function createSleepRecord(userId, { date, totalHours, deepSleepHours, lightSleepHours, remSleepHours, qualityScore, notes }) {
    if (!date || !totalHours) {
        throw new ApiError(400, "Missing required fields: date, totalHours");
    }

    // Validation : total_hours = deep + light + rem
    const calculatedTotal = (deepSleepHours || 0) + (lightSleepHours || 0) + (remSleepHours || 0);
    if (Math.abs(totalHours - calculatedTotal) > 0.01) {
        throw new ApiError(400, "Validation error: totalHours must equal sum of deep + light + rem sleep hours", [
            { field: "totalHours", msg: `totalHours (${totalHours}) does not equal deep (${deepSleepHours || 0}) + light (${lightSleepHours || 0}) + rem (${remSleepHours || 0})` }
        ]);
    }

    // Vérifier si un enregistrement existe déjà pour cette date
    const [existing] = await pool.query(
        `SELECT sleep_id FROM sleep_records WHERE user_id = ? AND sleep_date = ? LIMIT 1`,
        [userId, date]
    );

    if (existing.length > 0) {
        throw new ApiError(409, "Sleep record for this date already exists");
    }

    const [result] = await pool.query(
        `INSERT INTO sleep_records (user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, quality_score, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, date, totalHours, deepSleepHours || null, lightSleepHours || null, remSleepHours || null, qualityScore || null, notes || null]
    );

    return {
        sleepId: result.insertId,
        userId,
        date,
        totalHours,
        deepSleepHours: deepSleepHours || null,
        lightSleepHours: lightSleepHours || null,
        remSleepHours: remSleepHours || null,
        qualityScore: qualityScore || null,
        notes: notes || null,
    };
}

/**
 * Récupère un enregistrement de sommeil par ID (avec vérification de propriété)
 */
async function getSleepRecordById(sleepId, userId) {
    const [rows] = await pool.query(
        `SELECT sleep_id, user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, quality_score, timestamp, notes
         FROM sleep_records
         WHERE sleep_id = ? AND user_id = ?
         LIMIT 1`,
        [sleepId, userId]
    );

    if (!rows.length) {
        throw new ApiError(404, "Sleep record not found");
    }

    return rows[0];
}

/**
 * Récupère les enregistrements de sommeil de l'utilisateur avec pagination et filtres
 */
async function getSleepRecords(userId, { page = 1, limit = 10, dateFrom, dateTo }) {
    const offset = (page - 1) * limit;

    // Construction de la requête avec filtres optionnels
    let whereClause = "WHERE user_id = ?";
    const params = [userId];

    if (dateFrom) {
        whereClause += " AND sleep_date >= ?";
        params.push(dateFrom);
    }

    if (dateTo) {
        whereClause += " AND sleep_date <= ?";
        params.push(dateTo);
    }

    // Requête pour les données
    const [records] = await pool.query(
        `SELECT sleep_id, user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, quality_score, timestamp, notes
         FROM sleep_records
         ${whereClause}
         ORDER BY sleep_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Requête pour le total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM sleep_records ${whereClause}`,
        params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
        data: records,
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
    };
}

/**
 * Met à jour un enregistrement de sommeil (avec vérification de propriété)
 */
async function updateSleepRecord(sleepId, userId, updates) {
    // Vérifier que l'enregistrement appartient à l'utilisateur
    const [existing] = await pool.query(
        `SELECT sleep_id, sleep_date FROM sleep_records WHERE sleep_id = ? AND user_id = ?`,
        [sleepId, userId]
    );

    if (!existing.length) {
        throw new ApiError(404, "Sleep record not found");
    }

    // Si on change de date, vérifier qu'il n'existe pas déjà un enregistrement pour cette date
    if (updates.date && updates.date !== existing[0].sleep_date) {
        const [conflict] = await pool.query(
            `SELECT sleep_id FROM sleep_records WHERE user_id = ? AND sleep_date = ? AND sleep_id != ? LIMIT 1`,
            [userId, updates.date, sleepId]
        );

        if (conflict.length > 0) {
            throw new ApiError(409, "Sleep record for this date already exists");
        }
    }

    // Validation : si on met à jour les heures de sommeil, vérifier le total
    if (updates.totalHours !== undefined || updates.deepSleepHours !== undefined || updates.lightSleepHours !== undefined || updates.remSleepHours !== undefined) {
        const currentRecord = existing[0];
        const newTotal = updates.totalHours ?? currentRecord.total_hours;
        const newDeep = updates.deepSleepHours ?? (currentRecord.deep_sleep_hours || 0);
        const newLight = updates.lightSleepHours ?? (currentRecord.light_sleep_hours || 0);
        const newRem = updates.remSleepHours ?? (currentRecord.rem_sleep_hours || 0);

        const calculatedTotal = newDeep + newLight + newRem;
        if (Math.abs(newTotal - calculatedTotal) > 0.01) {
            throw new ApiError(400, "Validation error: totalHours must equal sum of deep + light + rem sleep hours");
        }
    }

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = ["date", "totalHours", "deepSleepHours", "lightSleepHours", "remSleepHours", "qualityScore", "notes"];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
        if (field in updates) {
            const dbField = field === "date" ? "sleep_date"
                : field === "totalHours" ? "total_hours"
                    : field === "deepSleepHours" ? "deep_sleep_hours"
                        : field === "lightSleepHours" ? "light_sleep_hours"
                            : field === "remSleepHours" ? "rem_sleep_hours"
                                : field === "qualityScore" ? "quality_score"
                                    : field;
            updateFields.push(`${dbField} = ?`);
            updateValues.push(updates[field]);
        }
    }

    if (updateFields.length === 0) {
        throw new ApiError(400, "No valid fields to update");
    }

    updateValues.push(sleepId, userId);

    const [result] = await pool.query(
        `UPDATE sleep_records SET ${updateFields.join(", ")} WHERE sleep_id = ? AND user_id = ?`,
        updateValues
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Sleep record not found");
    }

    // Retourner l'enregistrement mis à jour
    const [rows] = await pool.query(
        `SELECT sleep_id, user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, quality_score, timestamp, notes
         FROM sleep_records
         WHERE sleep_id = ? AND user_id = ?`,
        [sleepId, userId]
    );

    return rows[0];
}

/**
 * Supprime un enregistrement de sommeil (avec vérification de propriété)
 */
async function deleteSleepRecord(sleepId, userId) {
    const [result] = await pool.query(
        `DELETE FROM sleep_records WHERE sleep_id = ? AND user_id = ?`,
        [sleepId, userId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Sleep record not found");
    }

    return { sleepId, deleted: true };
}

/**
 * Récupère les statistiques de sommeil de l'utilisateur
 */
async function getSleepStats(userId, { dateFrom, dateTo } = {}) {
    let whereClause = "WHERE user_id = ?";
    const params = [userId];

    if (dateFrom) {
        whereClause += " AND sleep_date >= ?";
        params.push(dateFrom);
    }

    if (dateTo) {
        whereClause += " AND sleep_date <= ?";
        params.push(dateTo);
    }

    // Stats globales
    const [globalStats] = await pool.query(
        `SELECT 
            COUNT(*) as totalRecords,
            AVG(total_hours) as avgTotalHours,
            AVG(deep_sleep_hours) as avgDeepSleepHours,
            AVG(light_sleep_hours) as avgLightSleepHours,
            AVG(rem_sleep_hours) as avgRemSleepHours,
            AVG(quality_score) as avgQualityScore,
            MIN(total_hours) as minTotalHours,
            MAX(total_hours) as maxTotalHours,
            MIN(quality_score) as minQualityScore,
            MAX(quality_score) as maxQualityScore
         FROM sleep_records
         ${whereClause}`,
        params
    );

    // Tendance derniers 7 jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    let trendWhereClause = "WHERE user_id = ? AND sleep_date >= ?";
    const trendParams = [userId, sevenDaysAgoStr];

    if (dateTo) {
        trendWhereClause += " AND sleep_date <= ?";
        trendParams.push(dateTo);
    }

    const [trendData] = await pool.query(
        `SELECT 
            sleep_date,
            total_hours,
            quality_score,
            deep_sleep_hours,
            light_sleep_hours,
            rem_sleep_hours
         FROM sleep_records
         ${trendWhereClause}
         ORDER BY sleep_date ASC`,
        trendParams
    );

    return {
        overall: globalStats[0],
        trend: {
            period: "7_days",
            data: trendData,
        },
        dateRange: { from: dateFrom || null, to: dateTo || null },
    };
}

module.exports = {
    createSleepRecord,
    getSleepRecordById,
    getSleepRecords,
    updateSleepRecord,
    deleteSleepRecord,
    getSleepStats,
};
