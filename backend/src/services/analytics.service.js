const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Calcule la régression linéaire (y = slope*x + intercept)
 * Retourne : {slope, intercept, r_squared}
 */
function calculateLinearRegression(points) {
    if (points.length < 2) {
        return { slope: 0, intercept: points[0]?.y || 0, r_squared: 0 };
    }

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const x = points[i].x;
        const y = points[i].y;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
        const predicted = slope * points[i].x + intercept;
        ssRes += Math.pow(points[i].y - predicted, 2);
        ssTot += Math.pow(points[i].y - yMean, 2);
    }

    const r_squared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    return { slope, intercept, r_squared };
}

/**
 * Calcule l'écart-type
 */
function calculateStdDev(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Calcule le coefficient de corrélation de Pearson
 */
function calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) {
        return { coefficient: 0, interpretation: "Insufficient data" };
    }

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0, denomX = 0, denomY = 0;
    for (let i = 0; i < n; i++) {
        numerator += (x[i] - meanX) * (y[i] - meanY);
        denomX += Math.pow(x[i] - meanX, 2);
        denomY += Math.pow(y[i] - meanY, 2);
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator === 0) return { coefficient: 0, interpretation: "No variation in data" };

    const coefficient = numerator / denominator;

    let interpretation = "No correlation";
    if (Math.abs(coefficient) < 0.3) {
        interpretation = "Weak correlation";
    } else if (Math.abs(coefficient) < 0.6) {
        interpretation = "Moderate correlation";
    } else if (Math.abs(coefficient) < 0.8) {
        interpretation = "Strong correlation";
    } else {
        interpretation = "Very strong correlation";
    }

    if (coefficient < 0) {
        interpretation += " (negative)";
    } else if (coefficient > 0) {
        interpretation += " (positive)";
    }

    return { coefficient: Math.round(coefficient * 1000) / 1000, interpretation };
}

/**
 * Récupère les données de tendance
 */
async function getTrendData(userId, metric, period) {
    let query, params, dateFilter;

    const now = new Date();
    const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split("T")[0];

    if (metric === "sleep_quality") {
        query = `
            SELECT 
                sleep_date as date,
                quality_score as value
            FROM sleep_records
            WHERE user_id = ? AND sleep_date >= ?
            ORDER BY sleep_date ASC
        `;
        params = [userId, startDateStr];
    } else if (metric === "resting_hr") {
        query = `
            SELECT 
                DATE(timestamp) as date,
                AVG(bpm) as value
            FROM heart_rate
            WHERE user_id = ? AND context IN ('rest', 'sleep') AND timestamp >= ?
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        `;
        params = [userId, startDate.toISOString()];
    } else if (metric === "weekly_activity_minutes") {
        query = `
            SELECT 
                DATE(DATE_SUB(timestamp, INTERVAL WEEKDAY(timestamp) DAY)) as date,
                SUM(duration_minutes) as value
            FROM activities
            WHERE user_id = ? AND timestamp >= ?
            GROUP BY DATE(DATE_SUB(timestamp, INTERVAL WEEKDAY(timestamp) DAY))
            ORDER BY date ASC
        `;
        params = [userId, startDate.toISOString()];
    } else if (metric === "calories") {
        query = `
            SELECT 
                DATE(timestamp) as date,
                SUM(calories_burned) as value
            FROM activities
            WHERE user_id = ? AND timestamp >= ?
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        `;
        params = [userId, startDate.toISOString()];
    } else {
        throw new ApiError(400, "Invalid metric");
    }

    const [data] = await pool.query(query, params);

    // Convertir en points pour la régression
    const points = data.map((row, index) => ({
        x: index,
        y: parseFloat(row.value) || 0,
        date: row.date,
    }));

    return points;
}

/**
 * GET /api/analytics/trends
 */
async function getTrends(userId, metric, period) {
    if (![7, 30, 90].includes(period)) {
        throw new ApiError(400, "Period must be 7, 30, or 90");
    }

    const points = await getTrendData(userId, metric, period);

    if (points.length === 0) {
        return {
            metric,
            period,
            data: [],
            regression: { slope: 0, intercept: 0, r_squared: 0 },
        };
    }

    const regression = calculateLinearRegression(points);

    return {
        metric,
        period,
        data: points.map(p => ({ date: p.date, value: p.y })),
        regression: {
            slope: Math.round(regression.slope * 100) / 100,
            intercept: Math.round(regression.intercept * 100) / 100,
            r_squared: Math.round(regression.r_squared * 10000) / 10000,
        },
    };
}

/**
 * GET /api/analytics/predictions
 */
async function getPredictions(userId) {
    const predictions = {};

    const metrics = ["sleep_quality", "resting_hr", "weekly_activity_minutes", "calories"];

    for (const metric of metrics) {
        try {
            const points = await getTrendData(userId, metric, 30);

            if (points.length < 2) {
                predictions[metric] = {
                    j7: null,
                    j30: null,
                    trend_direction: "insufficient_data",
                };
                continue;
            }

            const regression = calculateLinearRegression(points);
            const values = points.map(p => p.y);
            const stdDev = calculateStdDev(values);

            // Prédictions
            const nextX = points.length;
            const j7_predicted = regression.slope * (nextX + 7) + regression.intercept;
            const j30_predicted = regression.slope * (nextX + 30) + regression.intercept;

            // Direction de la tendance
            let trend_direction = "stable";
            if (regression.slope > 0.1) {
                trend_direction = "up";
            } else if (regression.slope < -0.1) {
                trend_direction = "down";
            }

            predictions[metric] = {
                j7: {
                    predicted_value: Math.round(j7_predicted * 100) / 100,
                    confidence_interval_lower: Math.round((j7_predicted - stdDev) * 100) / 100,
                    confidence_interval_upper: Math.round((j7_predicted + stdDev) * 100) / 100,
                },
                j30: {
                    predicted_value: Math.round(j30_predicted * 100) / 100,
                    confidence_interval_lower: Math.round((j30_predicted - stdDev) * 100) / 100,
                    confidence_interval_upper: Math.round((j30_predicted + stdDev) * 100) / 100,
                },
                trend_direction,
            };
        } catch (error) {
            console.error(`Error predicting ${metric}:`, error);
            predictions[metric] = null;
        }
    }

    return predictions;
}

/**
 * Récupère les données de corrélation sommeil-FC
 */
async function getSleepHeartRateCorrelation(userId) {
    // Récupérer les nuits de mauvais sommeil (quality < 6)
    const [sleepData] = await pool.query(
        `SELECT 
            DATE(sleep_date) as date,
            quality_score,
            total_hours
         FROM sleep_records
         WHERE user_id = ?
         ORDER BY sleep_date DESC
         LIMIT 30`,
        [userId]
    );

    if (sleepData.length < 2) {
        return { correlation: 0, interpretation: "Insufficient data" };
    }

    // Pour chaque jour, récupérer la FC du jour suivant
    const sleepQuality = [];
    const nextDayHR = [];

    for (let i = 0; i < sleepData.length - 1; i++) {
        const currentDate = new Date(sleepData[i].date);
        const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        // Chercher la FC du jour suivant
        const [hrData] = await pool.query(
            `SELECT AVG(bpm) as avg_bpm
             FROM heart_rate
             WHERE user_id = ? AND DATE(timestamp) = ? AND context IN ('rest', 'sleep')`,
            [userId, nextDate.toISOString().split("T")[0]]
        );

        if (hrData[0]?.avg_bpm) {
            sleepQuality.push(sleepData[i].quality_score);
            nextDayHR.push(parseFloat(hrData[0].avg_bpm));
        }
    }

    if (sleepQuality.length < 2) {
        return { correlation: 0, interpretation: "Insufficient data" };
    }

    return calculatePearsonCorrelation(sleepQuality, nextDayHR);
}

/**
 * Récupère les données de corrélation activité-sommeil
 */
async function getActivitySleepCorrelation(userId) {
    // Récupérer les données d'activité des 30 derniers jours
    const [activityData] = await pool.query(
        `SELECT 
            DATE(timestamp) as date,
            SUM(calories_burned) as total_calories,
            SUM(duration_minutes) as total_duration
         FROM activities
         WHERE user_id = ?
         GROUP BY DATE(timestamp)
         ORDER BY date DESC
         LIMIT 30`,
        [userId]
    );

    if (activityData.length < 2) {
        return { correlation: 0, interpretation: "Insufficient data" };
    }

    const activityIntensity = [];
    const nextDaySleep = [];

    for (let i = 0; i < activityData.length - 1; i++) {
        const currentDate = new Date(activityData[i].date);
        const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        // Chercher le sommeil du jour suivant
        const [sleepData] = await pool.query(
            `SELECT quality_score, total_hours
             FROM sleep_records
             WHERE user_id = ? AND sleep_date = ?`,
            [userId, nextDate.toISOString().split("T")[0]]
        );

        if (sleepData[0]) {
            const intensity = (activityData[i].total_calories || 0) + (activityData[i].total_duration || 0) * 5;
            activityIntensity.push(intensity);
            nextDaySleep.push(sleepData[0].quality_score);
        }
    }

    if (activityIntensity.length < 2) {
        return { correlation: 0, interpretation: "Insufficient data" };
    }

    return calculatePearsonCorrelation(activityIntensity, nextDaySleep);
}

/**
 * GET /api/analytics/correlations
 */
async function getCorrelations(userId) {
    const [sleepHRCorr, activitySleepCorr] = await Promise.all([
        getSleepHeartRateCorrelation(userId),
        getActivitySleepCorrelation(userId),
    ]);

    return {
        sleep_impacts_heart_rate: {
            coefficient: sleepHRCorr.coefficient,
            interpretation: sleepHRCorr.interpretation,
            meaning: "Correlation between previous night's sleep quality and next day's resting HR",
        },
        activity_improves_sleep: {
            coefficient: activitySleepCorr.coefficient,
            interpretation: activitySleepCorr.interpretation,
            meaning: "Correlation between daily activity intensity and next night's sleep quality",
        },
    };
}

/**
 * GET /api/analytics/weekly-summary
 */
async function getWeeklySummary(userId) {
    const now = new Date();
    const currentWeekStart = new Date(now.getTime() - (now.getDay() || 7) * 24 * 60 * 60 * 1000);
    currentWeekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekEnd = new Date(currentWeekStart.getTime() - 1);

    const currentWeekStartStr = currentWeekStart.toISOString().split("T")[0];
    const previousWeekStartStr = previousWeekStart.toISOString().split("T")[0];
    const previousWeekEndStr = previousWeekEnd.toISOString().split("T")[0];

    // Activité semaine courante
    const [currentWeekActivity] = await pool.query(
        `SELECT 
            SUM(duration_minutes) as total_duration,
            SUM(calories_burned) as total_calories,
            COUNT(*) as activity_count
         FROM activities
         WHERE user_id = ? AND DATE(timestamp) >= ?`,
        [userId, currentWeekStartStr]
    );

    // Activité semaine précédente
    const [previousWeekActivity] = await pool.query(
        `SELECT 
            SUM(duration_minutes) as total_duration,
            SUM(calories_burned) as total_calories,
            COUNT(*) as activity_count
         FROM activities
         WHERE user_id = ? AND DATE(timestamp) >= ? AND DATE(timestamp) <= ?`,
        [userId, previousWeekStartStr, previousWeekEndStr]
    );

    // Sommeil semaine courante
    const [currentWeekSleep] = await pool.query(
        `SELECT 
            AVG(total_hours) as avg_sleep,
            AVG(quality_score) as avg_quality
         FROM sleep_records
         WHERE user_id = ? AND sleep_date >= ?`,
        [userId, currentWeekStartStr]
    );

    // Sommeil semaine précédente
    const [previousWeekSleep] = await pool.query(
        `SELECT 
            AVG(total_hours) as avg_sleep,
            AVG(quality_score) as avg_quality
         FROM sleep_records
         WHERE user_id = ? AND sleep_date >= ? AND sleep_date <= ?`,
        [userId, previousWeekStartStr, previousWeekEndStr]
    );

    // FC au repos semaine courante
    const [currentWeekHR] = await pool.query(
        `SELECT AVG(bpm) as avg_bpm
         FROM heart_rate
         WHERE user_id = ? AND context IN ('rest', 'sleep') AND timestamp >= ?`,
        [userId, currentWeekStart.toISOString()]
    );

    // FC au repos semaine précédente
    const [previousWeekHR] = await pool.query(
        `SELECT AVG(bpm) as avg_bpm
         FROM heart_rate
         WHERE user_id = ? AND context IN ('rest', 'sleep') AND timestamp >= ? AND timestamp <= ?`,
        [userId, previousWeekStart.toISOString(), previousWeekEnd.toISOString()]
    );

    // Calculer les variations
    const calcVariation = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 1000) / 10; // en %
    };

    const activityDuration = parseFloat(currentWeekActivity[0].total_duration) || 0;
    const prevActivityDuration = parseFloat(previousWeekActivity[0].total_duration) || 0;
    const activityVariation = calcVariation(activityDuration, prevActivityDuration);

    const avgSleep = parseFloat(currentWeekSleep[0].avg_sleep) || 0;
    const prevAvgSleep = parseFloat(previousWeekSleep[0].avg_sleep) || 0;
    const sleepVariation = calcVariation(avgSleep, prevAvgSleep);

    const avgQuality = parseFloat(currentWeekSleep[0].avg_quality) || 0;
    const prevAvgQuality = parseFloat(previousWeekSleep[0].avg_quality) || 0;
    const qualityVariation = calcVariation(avgQuality, prevAvgQuality);

    const avgHR = parseFloat(currentWeekHR[0].avg_bpm) || 0;
    const prevAvgHR = parseFloat(previousWeekHR[0].avg_bpm) || 0;
    const hrVariation = calcVariation(avgHR, prevAvgHR);

    return {
        period: {
            current_week_start: currentWeekStartStr,
            previous_week_start: previousWeekStartStr,
        },
        activity: {
            current: {
                total_minutes: Math.round(activityDuration),
                total_calories: Math.round(parseFloat(currentWeekActivity[0].total_calories) || 0),
                session_count: currentWeekActivity[0].activity_count || 0,
            },
            previous: {
                total_minutes: Math.round(prevActivityDuration),
                total_calories: Math.round(parseFloat(previousWeekActivity[0].total_calories) || 0),
                session_count: previousWeekActivity[0].activity_count || 0,
            },
            variation_percent: activityVariation,
            trend: activityVariation > 5 ? "improvement" : activityVariation < -5 ? "degradation" : "stable",
        },
        sleep: {
            current: {
                avg_hours: Math.round(avgSleep * 100) / 100,
                avg_quality: Math.round(avgQuality * 100) / 100,
            },
            previous: {
                avg_hours: Math.round(prevAvgSleep * 100) / 100,
                avg_quality: Math.round(prevAvgQuality * 100) / 100,
            },
            hours_variation_percent: sleepVariation,
            quality_variation_percent: qualityVariation,
            trend: qualityVariation > 5 ? "improvement" : qualityVariation < -5 ? "degradation" : "stable",
        },
        resting_heart_rate: {
            current: {
                avg_bpm: Math.round(avgHR),
            },
            previous: {
                avg_bpm: Math.round(prevAvgHR),
            },
            variation_percent: hrVariation,
            trend: hrVariation < -3 ? "improvement" : hrVariation > 3 ? "degradation" : "stable",
        },
    };
}

module.exports = {
    calculateLinearRegression,
    calculateStdDev,
    calculatePearsonCorrelation,
    getTrends,
    getPredictions,
    getCorrelations,
    getWeeklySummary,
};
