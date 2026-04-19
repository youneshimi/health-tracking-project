const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Insère une anomalie si elle n'existe pas dans les 24h
 */
async function insertAnomalyIfNew(userId, type, severity, description, relatedId = null) {
    try {
        // Vérifier si une anomalie similaire a été détectée dans les 24h
        const [existing] = await pool.query(
            `SELECT anomaly_id FROM anomalies 
             WHERE user_id = ? AND type = ? AND severity = ? AND description = ? 
             AND detected_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             LIMIT 1`,
            [userId, type, severity, description]
        );

        if (existing.length > 0) {
            return null; // Doublon, ne pas insérer
        }

        // Insérer la nouvelle anomalie
        const [result] = await pool.query(
            `INSERT INTO anomalies (user_id, type, severity, detected_at, description, related_id)
             VALUES (?, ?, ?, NOW(), ?, ?)`,
            [userId, type, severity, description, relatedId]
        );

        return result.insertId;
    } catch (error) {
        console.error("Error inserting anomaly:", error);
        throw error;
    }
}

/**
 * Détecte les anomalies de fréquence cardiaque
 */
async function detectHeartRateAnomalies(userId) {
    const anomaliesInserted = [];

    try {
        // 1. BPM au repos > 100 → tachycardie (high)
        const [tachycardia] = await pool.query(
            `SELECT hr_id, bpm FROM heart_rate 
             WHERE user_id = ? AND context IN ('rest', 'sleep') AND bpm > 100
             ORDER BY timestamp DESC
             LIMIT 1`,
            [userId]
        );

        if (tachycardia.length > 0) {
            const anomalyId = await insertAnomalyIfNew(
                userId,
                "heart_rate",
                "high",
                `Tachycardia at rest detected: ${tachycardia[0].bpm} bpm`,
                tachycardia[0].hr_id
            );
            if (anomalyId) anomaliesInserted.push(anomalyId);
        }

        // 2. BPM au repos < 50 → bradycardie (medium)
        const [bradycardia] = await pool.query(
            `SELECT hr_id, bpm FROM heart_rate 
             WHERE user_id = ? AND context IN ('rest', 'sleep') AND bpm < 50
             ORDER BY timestamp DESC
             LIMIT 1`,
            [userId]
        );

        if (bradycardia.length > 0) {
            const anomalyId = await insertAnomalyIfNew(
                userId,
                "heart_rate",
                "medium",
                `Bradycardia detected: ${bradycardia[0].bpm} bpm`,
                bradycardia[0].hr_id
            );
            if (anomalyId) anomaliesInserted.push(anomalyId);
        }

        // 3. Variation > 30 bpm entre deux mesures consécutives au repos (medium)
        const [restMeasurements] = await pool.query(
            `SELECT hr_id, bpm, timestamp FROM heart_rate 
             WHERE user_id = ? AND context IN ('rest', 'sleep')
             ORDER BY timestamp DESC
             LIMIT 100`,
            [userId]
        );

        for (let i = 0; i < restMeasurements.length - 1; i++) {
            const current = restMeasurements[i];
            const next = restMeasurements[i + 1];
            const variation = Math.abs(current.bpm - next.bpm);

            if (variation > 30) {
                // Vérifier que c'est une variation suspecte (pas d'activité entre)
                const timeDiff = (new Date(current.timestamp) - new Date(next.timestamp)) / 60000; // en minutes
                if (timeDiff < 30) {
                    // Variation rapide suspecte
                    const anomalyId = await insertAnomalyIfNew(
                        userId,
                        "heart_rate",
                        "medium",
                        `Sudden heart rate variation: ${current.bpm} → ${next.bpm} bpm (${variation} bpm change)`,
                        current.hr_id
                    );
                    if (anomalyId) {
                        anomaliesInserted.push(anomalyId);
                        break; // Une détection par cycle suffit
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error detecting heart rate anomalies:", error);
    }

    return anomaliesInserted;
}

/**
 * Détecte les anomalies de sommeil
 */
async function detectSleepAnomalies(userId) {
    const anomaliesInserted = [];

    try {
        // 1. < 6h de sommeil sur 3 nuits consécutives (high)
        const [sleepData] = await pool.query(
            `SELECT sleep_id, sleep_date, total_hours FROM sleep_records 
             WHERE user_id = ?
             ORDER BY sleep_date DESC
             LIMIT 10`,
            [userId]
        );

        for (let i = 0; i < sleepData.length - 2; i++) {
            const night1 = sleepData[i];
            const night2 = sleepData[i + 1];
            const night3 = sleepData[i + 2];

            // Vérifier que ce sont 3 nuits consécutives
            const date1 = new Date(night1.sleep_date);
            const date2 = new Date(night2.sleep_date);
            const date3 = new Date(night3.sleep_date);

            const dayDiff1 = (date1 - date2) / (1000 * 60 * 60 * 24);
            const dayDiff2 = (date2 - date3) / (1000 * 60 * 60 * 24);

            if (Math.abs(dayDiff1 - 1) < 0.1 && Math.abs(dayDiff2 - 1) < 0.1) {
                // 3 nuits consécutives
                if (night1.total_hours < 6 && night2.total_hours < 6 && night3.total_hours < 6) {
                    const anomalyId = await insertAnomalyIfNew(
                        userId,
                        "sleep",
                        "high",
                        `Insufficient sleep over 3 consecutive nights: ${night1.total_hours}h, ${night2.total_hours}h, ${night3.total_hours}h`,
                        night1.sleep_id
                    );
                    if (anomalyId) {
                        anomaliesInserted.push(anomalyId);
                        break;
                    }
                }
            }
        }

        // 2. quality_score < 4 sur 5 jours consécutifs (medium)
        for (let i = 0; i < sleepData.length - 4; i++) {
            let consecutiveLowQuality = 0;
            let startDate = sleepData[i].sleep_date;

            for (let j = i; j < i + 5 && j < sleepData.length; j++) {
                if (sleepData[j].quality_score !== null && sleepData[j].quality_score < 4) {
                    consecutiveLowQuality++;
                } else {
                    break;
                }
            }

            if (consecutiveLowQuality === 5) {
                const anomalyId = await insertAnomalyIfNew(
                    userId,
                    "sleep",
                    "medium",
                    `Low sleep quality for 5 consecutive nights (quality score < 4)`,
                    sleepData[i].sleep_id
                );
                if (anomalyId) {
                    anomaliesInserted.push(anomalyId);
                    break;
                }
            }
        }

        // 3. Ratio deep_sleep < 10% du total (low)
        const [recentSleep] = await pool.query(
            `SELECT sleep_id, total_hours, deep_sleep_hours FROM sleep_records 
             WHERE user_id = ?
             ORDER BY sleep_date DESC
             LIMIT 1`,
            [userId]
        );

        if (recentSleep.length > 0) {
            const record = recentSleep[0];
            if (record.deep_sleep_hours && record.total_hours) {
                const deepRatio = record.deep_sleep_hours / record.total_hours;
                if (deepRatio < 0.1) {
                    const anomalyId = await insertAnomalyIfNew(
                        userId,
                        "sleep",
                        "low",
                        `Low deep sleep ratio: ${(deepRatio * 100).toFixed(1)}% of total sleep (expected: >10%)`,
                        record.sleep_id
                    );
                    if (anomalyId) anomaliesInserted.push(anomalyId);
                }
            }
        }
    } catch (error) {
        console.error("Error detecting sleep anomalies:", error);
    }

    return anomaliesInserted;
}

/**
 * Détecte les anomalies d'activité
 */
async function detectActivityAnomalies(userId) {
    const anomaliesInserted = [];

    try {
        // 1. 0 activité sur 14 jours consécutifs (medium)
        const [activityDays] = await pool.query(
            `SELECT DISTINCT DATE(timestamp) as activity_date 
             FROM activities 
             WHERE user_id = ?
             ORDER BY activity_date DESC
             LIMIT 30`,
            [userId]
        );

        if (activityDays.length > 0) {
            const activeDates = activityDays.map(d => new Date(d.activity_date).getTime());
            let inactiveStreak = 0;
            let lastDate = new Date().getTime();

            for (const date of activeDates) {
                const dayDiff = (lastDate - date) / (1000 * 60 * 60 * 24);
                if (dayDiff <= 1) {
                    inactiveStreak = 0;
                } else {
                    inactiveStreak = Math.max(inactiveStreak, dayDiff);
                }
                lastDate = date;
            }

            // Vérifier aussi depuis la dernière activité jusqu'à aujourd'hui
            if (activityDays.length > 0) {
                const lastActivityDate = new Date(activityDays[activityDays.length - 1].activity_date).getTime();
                const daysSinceLastActivity = (new Date().getTime() - lastActivityDate) / (1000 * 60 * 60 * 24);

                if (daysSinceLastActivity >= 14) {
                    const anomalyId = await insertAnomalyIfNew(
                        userId,
                        "activity",
                        "medium",
                        `No activity recorded for ${Math.floor(daysSinceLastActivity)} consecutive days`,
                        null
                    );
                    if (anomalyId) anomaliesInserted.push(anomalyId);
                }
            }
        }

        // 2. Calories brûlées > 1500 en une session (low)
        const [excessiveCalories] = await pool.query(
            `SELECT activity_id, calories_burned, activity_type FROM activities 
             WHERE user_id = ? AND calories_burned > 1500
             ORDER BY timestamp DESC
             LIMIT 1`,
            [userId]
        );

        if (excessiveCalories.length > 0) {
            const anomalyId = await insertAnomalyIfNew(
                userId,
                "activity",
                "low",
                `Extremely high calories burned in single session: ${excessiveCalories[0].calories_burned} kcal (${excessiveCalories[0].activity_type})`,
                excessiveCalories[0].activity_id
            );
            if (anomalyId) anomaliesInserted.push(anomalyId);
        }
    } catch (error) {
        console.error("Error detecting activity anomalies:", error);
    }

    return anomaliesInserted;
}

/**
 * Exécute la détection complète d'anomalies pour un utilisateur
 */
async function runFullDetection(userId) {
    console.log(`[AnomalyDetector] Running full detection for user ${userId}...`);

    const allAnomalies = [];

    try {
        const hrAnomalies = await detectHeartRateAnomalies(userId);
        allAnomalies.push(...hrAnomalies);

        const sleepAnomalies = await detectSleepAnomalies(userId);
        allAnomalies.push(...sleepAnomalies);

        const activityAnomalies = await detectActivityAnomalies(userId);
        allAnomalies.push(...activityAnomalies);

        if (allAnomalies.length > 0) {
            console.log(`[AnomalyDetector] Detected ${allAnomalies.length} new anomalies for user ${userId}`);
        }

        return allAnomalies;
    } catch (error) {
        console.error(`[AnomalyDetector] Error during full detection for user ${userId}:`, error);
        throw error;
    }
}

module.exports = {
    detectHeartRateAnomalies,
    detectSleepAnomalies,
    detectActivityAnomalies,
    runFullDetection,
};
