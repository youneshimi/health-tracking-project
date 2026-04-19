const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Crée une mesure de fréquence cardiaque
 */
async function createHeartRateRecord(userId, { timestamp, bpm, context }) {
    if (!timestamp || !bpm) {
        throw new ApiError(400, "Missing required fields: timestamp, bpm");
    }

    const [result] = await pool.query(
        `INSERT INTO heart_rate (user_id, timestamp, bpm, context)
         VALUES (?, ?, ?, ?)`,
        [userId, timestamp, bpm, context || null]
    );

    return {
        hrId: result.insertId,
        userId,
        timestamp,
        bpm,
        context: context || null,
    };
}

/**
 * Récupère une mesure par ID (avec vérification de propriété)
 */
async function getHeartRateRecordById(hrId, userId) {
    const [rows] = await pool.query(
        `SELECT hr_id, user_id, timestamp, bpm, context
         FROM heart_rate
         WHERE hr_id = ? AND user_id = ?
         LIMIT 1`,
        [hrId, userId]
    );

    if (!rows.length) {
        throw new ApiError(404, "Heart rate record not found");
    }

    return rows[0];
}

/**
 * Récupère les mesures de fréquence cardiaque avec pagination et filtres
 */
async function getHeartRateRecords(userId, { page = 1, limit = 50, context, dateFrom, dateTo }) {
    const offset = (page - 1) * limit;

    // Construction de la requête avec filtres optionnels
    let whereClause = "WHERE user_id = ?";
    const params = [userId];

    if (context) {
        whereClause += " AND context = ?";
        params.push(context);
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
    const [records] = await pool.query(
        `SELECT hr_id, user_id, timestamp, bpm, context
         FROM heart_rate
         ${whereClause}
         ORDER BY timestamp DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Requête pour le total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM heart_rate ${whereClause}`,
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
 * Insère plusieurs mesures en une transaction atomique
 */
async function batchInsertHeartRateRecords(userId, records) {
    if (!Array.isArray(records) || records.length === 0) {
        throw new ApiError(400, "records must be a non-empty array");
    }

    if (records.length > 100) {
        throw new ApiError(400, `Maximum 100 records per batch, got ${records.length}`);
    }

    // Valider toutes les entrées avant la transaction
    const validationErrors = [];
    records.forEach((record, index) => {
        if (!record.timestamp || !record.bpm) {
            validationErrors.push({
                index,
                field: "timestamp/bpm",
                msg: "timestamp and bpm are required",
            });
        }
        if (record.bpm && (record.bpm < 30 || record.bpm > 250)) {
            validationErrors.push({
                index,
                field: "bpm",
                msg: `bpm must be between 30 and 250, got ${record.bpm}`,
            });
        }
        if (record.context && !["rest", "exercise", "recovery", "sleep"].includes(record.context)) {
            validationErrors.push({
                index,
                field: "context",
                msg: `context must be one of: rest, exercise, recovery, sleep`,
            });
        }
        const recordTime = new Date(record.timestamp);
        if (isNaN(recordTime.getTime())) {
            validationErrors.push({
                index,
                field: "timestamp",
                msg: "timestamp must be a valid ISO datetime",
            });
        }
        if (recordTime > new Date()) {
            validationErrors.push({
                index,
                field: "timestamp",
                msg: "timestamp cannot be in the future",
            });
        }
    });

    if (validationErrors.length > 0) {
        throw new ApiError(400, "Batch validation errors", validationErrors);
    }

    // Commencer la transaction
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const insertedRecords = [];
        for (const record of records) {
            const [result] = await connection.query(
                `INSERT INTO heart_rate (user_id, timestamp, bpm, context)
                 VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    record.timestamp,
                    record.bpm,
                    record.context || null,
                ]
            );

            insertedRecords.push({
                hrId: result.insertId,
                userId,
                timestamp: record.timestamp,
                bpm: record.bpm,
                context: record.context || null,
            });
        }

        await connection.commit();
        return {
            inserted: insertedRecords.length,
            records: insertedRecords,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Supprime une mesure (avec vérification de propriété)
 */
async function deleteHeartRateRecord(hrId, userId) {
    const [result] = await pool.query(
        `DELETE FROM heart_rate WHERE hr_id = ? AND user_id = ?`,
        [hrId, userId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Heart rate record not found");
    }

    return { hrId, deleted: true };
}

/**
 * Récupère les statistiques de fréquence cardiaque
 */
async function getHeartRateStats(userId, { dateFrom, dateTo } = {}) {
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

    // Stats globales par contexte
    const [statsByContext] = await pool.query(
        `SELECT 
            context,
            COUNT(*) as count,
            MIN(bpm) as minBpm,
            MAX(bpm) as maxBpm,
            AVG(bpm) as avgBpm,
            STDDEV_POP(bpm) as stddev
         FROM heart_rate
         ${whereClause}
         GROUP BY context
         ORDER BY count DESC`,
        params
    );

    // Stats globales
    const [overallStats] = await pool.query(
        `SELECT 
            COUNT(*) as totalRecords,
            MIN(bpm) as minBpm,
            MAX(bpm) as maxBpm,
            AVG(bpm) as avgBpm,
            STDDEV_POP(bpm) as stddev
         FROM heart_rate
         ${whereClause}`,
        params
    );

    // Évolution sur les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    let trendWhereClause = "WHERE user_id = ? AND DATE(timestamp) >= ?";
    const trendParams = [userId, thirtyDaysAgoStr];

    if (dateTo) {
        trendWhereClause += " AND DATE(timestamp) <= ?";
        trendParams.push(dateTo);
    }

    const [trendData] = await pool.query(
        `SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count,
            MIN(bpm) as minBpm,
            MAX(bpm) as maxBpm,
            AVG(bpm) as avgBpm
         FROM heart_rate
         ${trendWhereClause}
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        trendParams
    );

    return {
        overall: overallStats[0],
        byContext: statsByContext,
        trend: {
            period: "30_days",
            data: trendData,
        },
        dateRange: { from: dateFrom || null, to: dateTo || null },
    };
}

module.exports = {
    createHeartRateRecord,
    getHeartRateRecordById,
    getHeartRateRecords,
    batchInsertHeartRateRecords,
    deleteHeartRateRecord,
    getHeartRateStats,
};
