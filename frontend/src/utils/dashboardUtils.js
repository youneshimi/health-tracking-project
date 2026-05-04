/**
 * Utilitaires pour les calculs de données du dashboard
 */

/**
 * Calcule la variation en pourcentage
 */
export function calculateVariation(current, previous) {
    if (previous === 0 || previous === undefined) {
        return { percentage: 0, isPositive: true };
    }
    const percentage = ((current - previous) / previous) * 100;
    return {
        percentage: Math.round(percentage),
        isPositive: percentage >= 0,
    };
}

/**
 * Format d'une valeur avec variation
 */
export function formatWithVariation(current, variation) {
    const sign = variation.isPositive ? "↑" : "↓";
    const color = variation.isPositive ? "positive" : "negative";
    return {
        display: `${sign} ${Math.abs(variation.percentage)}%`,
        color,
        value: `${sign} ${variation.isPositive ? "+" : "-"}${Math.abs(
            variation.percentage
        )}%`,
    };
}

/**
 * Groupe les données par jour
 */
export function groupByDate(records, dateField = "date") {
    return records.reduce((acc, record) => {
        const date = record[dateField];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(record);
        return acc;
    }, {});
}

/**
 * Résume les activités de la semaine
 */
export function getWeeklyActivitySummary(activities) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = activities.filter((a) => {
        const date = new Date(a.date);
        return date >= weekAgo && date <= now;
    });

    const previousWeek = activities.filter((a) => {
        const date = new Date(a.date);
        return date >= twoWeeksAgo && date < weekAgo;
    });

    const currentTotalMinutes = currentWeek.reduce(
        (sum, a) => sum + (a.duration_minutes || 0),
        0
    );
    const previousTotalMinutes = previousWeek.reduce(
        (sum, a) => sum + (a.duration_minutes || 0),
        0
    );

    return {
        count: currentWeek.length,
        totalMinutes: currentTotalMinutes,
        variation: calculateVariation(currentTotalMinutes, previousTotalMinutes),
    };
}

/**
 * Résume le sommeil des 7 derniers jours
 */
export function getWeeklySleepSummary(sleepRecords) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = sleepRecords.filter((s) => {
        const date = new Date(s.sleep_date);
        return date >= weekAgo && date <= now;
    });

    const previousWeek = sleepRecords.filter((s) => {
        const date = new Date(s.sleep_date);
        return date >= twoWeeksAgo && date < weekAgo;
    });

    const currentAvgHours =
        currentWeek.length > 0
            ? (
                currentWeek.reduce((sum, s) => sum + (s.total_hours || 0), 0) /
                currentWeek.length
            ).toFixed(1)
            : 0;

    const previousAvgHours =
        previousWeek.length > 0
            ? (
                previousWeek.reduce((sum, s) => sum + (s.total_hours || 0), 0) /
                previousWeek.length
            ).toFixed(1)
            : 0;

    const currentAvgQuality =
        currentWeek.length > 0
            ? Math.round(
                currentWeek.reduce((sum, s) => sum + (s.quality_score || 0), 0) /
                currentWeek.length
            )
            : 0;

    return {
        avgHours: currentAvgHours,
        avgQuality: currentAvgQuality,
        variation: calculateVariation(currentAvgHours, previousAvgHours),
    };
}

/**
 * Résume la FC des 7 derniers jours
 */
export function getWeeklyHeartRateSummary(heartRateRecords) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = heartRateRecords.filter((hr) => {
        const date = new Date(hr.recorded_at);
        return date >= weekAgo && date <= now;
    });

    const previousWeek = heartRateRecords.filter((hr) => {
        const date = new Date(hr.recorded_at);
        return date >= twoWeeksAgo && date < weekAgo;
    });

    const currentAvgBPM =
        currentWeek.length > 0
            ? Math.round(
                currentWeek.reduce((sum, hr) => sum + (hr.bpm || 0), 0) /
                currentWeek.length
            )
            : 0;

    const previousAvgBPM =
        previousWeek.length > 0
            ? Math.round(
                previousWeek.reduce((sum, hr) => sum + (hr.bpm || 0), 0) /
                previousWeek.length
            )
            : 0;

    return {
        avgBPM: currentAvgBPM,
        variation: calculateVariation(currentAvgBPM, previousAvgBPM),
    };
}

/**
 * Résume les calories de la semaine
 */
export function getWeeklyCaloriesSummary(activities) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = activities.filter((a) => {
        const date = new Date(a.date);
        return date >= weekAgo && date <= now;
    });

    const previousWeek = activities.filter((a) => {
        const date = new Date(a.date);
        return date >= twoWeeksAgo && date < weekAgo;
    });

    const currentTotalCalories = currentWeek.reduce(
        (sum, a) => sum + (a.calories_burned || 0),
        0
    );
    const previousTotalCalories = previousWeek.reduce(
        (sum, a) => sum + (a.calories_burned || 0),
        0
    );

    return {
        totalCalories: currentTotalCalories,
        variation: calculateVariation(currentTotalCalories, previousTotalCalories),
    };
}

/**
 * Formate les données d'activité pour recharts (30 derniers jours)
 */
export function formatActivityChartData(activities) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = activities.filter((a) => {
        const date = new Date(a.date);
        return date >= thirtyDaysAgo && date <= now;
    });

    const grouped = filtered.reduce((acc, activity) => {
        const date = activity.date;
        if (!acc[date]) {
            acc[date] = {};
        }
        const type = activity.type || "other";
        acc[date][type] = (acc[date][type] || 0) + (activity.calories_burned || 0);
        acc[date].total = (acc[date].total || 0) + (activity.calories_burned || 0);
        return acc;
    }, {});

    return Object.entries(grouped)
        .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString("fr-FR", {
                month: "short",
                day: "numeric",
            }),
            total: data.total,
            ...data,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Formate les données de sommeil pour recharts (14 derniers jours)
 */
export function formatSleepChartData(sleepRecords) {
    const now = new Date();
    const fourteenDaysAgo = new Date(
        now.getTime() - 14 * 24 * 60 * 60 * 1000
    );

    return sleepRecords
        .filter((s) => {
            const date = new Date(s.sleep_date);
            return date >= fourteenDaysAgo && date <= now;
        })
        .map((s) => ({
            date: new Date(s.sleep_date).toLocaleDateString("fr-FR", {
                month: "short",
                day: "numeric",
            }),
            deep: s.deep_sleep_hours || 0,
            light: s.light_sleep_hours || 0,
            rem: s.rem_sleep_hours || 0,
            total: s.total_hours || 0,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Formate les données de FC pour recharts (50 dernières mesures)
 */
export function formatHeartRateChartData(heartRateRecords) {
    return heartRateRecords
        .slice(0, 50)
        .map((hr) => {
            const ts = hr.recorded_at || hr.timestamp;
            const dateObj = new Date(ts);
            return {
                ts,
                time: dateObj.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                bpm: hr.bpm || 0,
            };
        })
        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
        .map(({ ts, time, bpm }) => ({
            ts,
            time,
            bpm,
        }));
}
