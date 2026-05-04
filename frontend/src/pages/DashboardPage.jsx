import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import Layout from "../components/layout/Layout";
import { useActivities } from "../hooks/useActivities";
import { useSleep } from "../hooks/useSleep";
import { useHeartRate } from "../hooks/useHeartRate";
import { useAnomalies } from "../hooks/useAnomalies";
import {
    getWeeklyActivitySummary,
    getWeeklySleepSummary,
    getWeeklyHeartRateSummary,
    getWeeklyCaloriesSummary,
    formatActivityChartData,
    formatSleepChartData,
    formatHeartRateChartData,
    formatWithVariation,
} from "../utils/dashboardUtils";
import styles from "./DashboardPage.module.css";

/**
 * Composant de KPI Card
 */
function KPICard({ title, value, unit, variation, icon }) {
    const variationDisplay = formatWithVariation(value, variation);

    return (
        <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>{icon}</div>
            <div className={styles.kpiContent}>
                <div className={styles.kpiTitle}>{title}</div>
                <div className={styles.kpiValue}>
                    {value}
                    {unit && <span style={{ fontSize: "16px", marginLeft: "4px" }}>{unit}</span>}
                </div>
                <div className={styles.kpiSubtitle}>vs semaine précédente</div>
                <div className={`${styles.kpiVariation} ${styles[variationDisplay.color]}`}>
                    <span className={styles.kpiVariationIcon}>{variationDisplay.display}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton loader pour KPI
 */
function SkeletonKPI() {
    return (
        <div className={styles.skeletonKPI}>
            <div className={`${styles.skeleton} ${styles.skeletonIcon}`}></div>
            <div className={styles.skeletonContent}>
                <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonValue}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonBadge}`}></div>
            </div>
        </div>
    );
}

/**
 * Skeleton loader pour chart
 */
function SkeletonChart() {
    return (
        <div className={styles.skeletonChart}>
            <div className={`${styles.skeleton} ${styles.skeletonChartTitle}`}></div>
            <div className={`${styles.skeleton} ${styles.skeletonChartArea}`}></div>
        </div>
    );
}

/**
 * Icônes SVG inline
 */
const ActivityIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

const SleepIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

const HeartIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ec4899"
        strokeWidth="2"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);

const CaloriesIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
    >
        <path d="M6.5 13c.7-4.6 1.9-7 6.5-7 4.6 0 5.8 2.4 6.5 7"></path>
        <path d="M6 17c0 1-1 2-1 2s-1-1-1-2 1-4 8-4 8 3 8 4-1 1-1 1s-1-1-1-2"></path>
    </svg>
);

/**
 * Page Dashboard
 */
export default function DashboardPage() {
    // Hooks
    const { activities, isLoading: activitiesLoading, getActivities } = useActivities();
    const { sleepRecords, isLoading: sleepLoading, getSleepRecords } = useSleep();
    const { heartRateRecords, isLoading: hrLoading, getHeartRateRecords } = useHeartRate();
    const { anomalies, isLoading: anomaliesLoading, getAnomalies } = useAnomalies();

    // États
    const [kpiData, setKpiData] = useState(null);
    const [chartData, setChartData] = useState(null);

    // Charger les séries principales
    useEffect(() => {
        const loadDashboardData = async () => {
            await Promise.all([
                getActivities(),
                getSleepRecords(),
                getHeartRateRecords(),
            ]);
        };

        loadDashboardData();
    }, [getActivities, getSleepRecords, getHeartRateRecords]);

    // Charger les données
    useEffect(() => {
        // Récupérer toutes les activités, sommeil, FC
        if (!activitiesLoading && !sleepLoading && !hrLoading) {
            const activitySummary = getWeeklyActivitySummary(activities);
            const sleepSummary = getWeeklySleepSummary(sleepRecords);
            const hrSummary = getWeeklyHeartRateSummary(heartRateRecords);
            const caloriesSummary = getWeeklyCaloriesSummary(activities);

            setKpiData({
                activities: activitySummary,
                sleep: sleepSummary,
                heartRate: hrSummary,
                calories: caloriesSummary,
            });

            setChartData({
                activity: formatActivityChartData(activities),
                sleep: formatSleepChartData(sleepRecords),
                heartRate: formatHeartRateChartData(heartRateRecords),
            });
        }
    }, [activities, sleepRecords, heartRateRecords, activitiesLoading, sleepLoading, hrLoading]);

    // Charger les anomalies
    useEffect(() => {
        getAnomalies(3);
    }, [getAnomalies]);

    const isLoading =
        activitiesLoading || sleepLoading || hrLoading || !kpiData || !chartData;

    return (
        <Layout pageTitle="Dashboard">
            {/* ============ SECTION 1: KPI Cards ============ */}
            <div className={styles.kpiSection}>
                <h2 className={styles.sectionTitle}>Résumé Rapide</h2>
                <div className={styles.kpiGrid}>
                    {isLoading ? (
                        <>
                            <SkeletonKPI />
                            <SkeletonKPI />
                            <SkeletonKPI />
                            <SkeletonKPI />
                        </>
                    ) : (
                        <>
                            <KPICard
                                title="Activités cette semaine"
                                value={kpiData.activities.count}
                                unit="séances"
                                variation={kpiData.activities.variation}
                                icon={<ActivityIcon />}
                            />
                            <KPICard
                                title="Sommeil moyen"
                                value={kpiData.sleep.avgHours}
                                unit="h"
                                variation={kpiData.sleep.variation}
                                icon={<SleepIcon />}
                            />
                            <KPICard
                                title="FC repos"
                                value={kpiData.heartRate.avgBPM}
                                unit="bpm"
                                variation={kpiData.heartRate.variation}
                                icon={<HeartIcon />}
                            />
                            <KPICard
                                title="Calories brûlées"
                                value={kpiData.calories.totalCalories}
                                unit="kcal"
                                variation={kpiData.calories.variation}
                                icon={<CaloriesIcon />}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* ============ SECTION 2: Activités 30j ============ */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Activités - 30 derniers jours</h2>
                {isLoading ? (
                    <SkeletonChart />
                ) : chartData.activity && chartData.activity.length > 0 ? (
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.activity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
                                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="running" stackId="a" fill="#3b82f6" name="Course" />
                                <Bar dataKey="cycling" stackId="a" fill="#8b5cf6" name="Cyclisme" />
                                <Bar dataKey="swimming" stackId="a" fill="#06b6d4" name="Natation" />
                                <Bar dataKey="walking" stackId="a" fill="#10b981" name="Marche" />
                                <Bar dataKey="other" stackId="a" fill="#f59e0b" name="Autre" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className={styles.loadingText}>Aucune donnée disponible</div>
                )}
            </div>

            {/* ============ SECTION 3: Sommeil 14j ============ */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Sommeil - 14 derniers jours</h2>
                {isLoading ? (
                    <SkeletonChart />
                ) : chartData.sleep && chartData.sleep.length > 0 ? (
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData.sleep}>
                                <defs>
                                    <linearGradient id="colorDeep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
                                <YAxis domain={[0, 10]} stroke="#64748b" style={{ fontSize: "12px" }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                    }}
                                />
                                <ReferenceLine y={7} stroke="#10b981" strokeDasharray="3 3" label="7h (recommandé)" />
                                <Area
                                    type="monotone"
                                    dataKey="deep"
                                    stackId="1"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorDeep)"
                                    name="Sommeil profond"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="light"
                                    stackId="1"
                                    stroke="#60a5fa"
                                    fillOpacity={1}
                                    fill="url(#colorLight)"
                                    name="Sommeil léger"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="rem"
                                    stackId="1"
                                    stroke="#93c5fd"
                                    fillOpacity={1}
                                    fill="url(#colorRem)"
                                    name="Sommeil REM"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className={styles.loadingText}>Aucune donnée disponible</div>
                )}
            </div>

            {/* ============ SECTION 4: FC Récente ============ */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Fréquence Cardiaque - 50 dernières mesures</h2>
                {isLoading ? (
                    <SkeletonChart />
                ) : chartData.heartRate && chartData.heartRate.length > 0 ? (
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData.heartRate}>
                                <defs>
                                    <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#64748b"
                                    style={{ fontSize: "10px" }}
                                />
                                <YAxis domain={[40, 130]} stroke="#64748b" style={{ fontSize: "12px" }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                    }}
                                    formatter={(value) => [`${value} bpm`, "FC"]}
                                />
                                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label="Bradycardie" />
                                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label="Tachycardie" />
                                <Line
                                    type="monotone"
                                    dataKey="bpm"
                                    stroke="#ec4899"
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Fréquence Cardiaque"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className={styles.loadingText}>Aucune donnée disponible</div>
                )}
            </div>

            {/* ============ SECTION 5: Anomalies Récentes ============ */}
            <div className={styles.anomaliesSection}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <h2 className={styles.sectionTitle}>Anomalies Récentes</h2>
                    <a href="/anomalies" className={styles.viewAllLink}>
                        Voir tout →
                    </a>
                </div>

                {anomaliesLoading ? (
                    <div className={styles.loadingText}>Chargement...</div>
                ) : anomalies && anomalies.length > 0 ? (
                    <ul className={styles.anomaliesList}>
                        {anomalies.slice(0, 3).map((anomaly) => (
                            <li key={anomaly.id} className={styles.anomalyItem}>
                                <span className={styles.anomalyIcon}>⚠️</span>
                                <div className={styles.anomalyContent}>
                                    <div className={styles.anomalyType}>{anomaly.anomaly_type}</div>
                                    <div className={styles.anomalyDesc}>{anomaly.description}</div>
                                    <div className={styles.anomalyMeta}>
                                        <span>
                                            {new Date(anomaly.detected_at).toLocaleDateString("fr-FR", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                        <span className={`${styles.severityBadge} ${styles[anomaly.severity]}`}>
                                            {anomaly.severity}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className={styles.loadingText}>Aucune anomalie détectée 🎉</div>
                )}
            </div>
        </Layout>
    );
}

