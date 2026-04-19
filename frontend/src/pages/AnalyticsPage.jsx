import React, { useState, useEffect, useMemo } from "react";
import {
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
import { useAnalytics } from "../hooks/useAnalytics";
import styles from "./DataPages.module.css";

const METRICS = [
    { value: "sleep_quality", label: "Sommeil", icon: "😴" },
    { value: "weekly_activity_minutes", label: "Activité", icon: "🏃" },
    { value: "resting_hr", label: "Fréquence Cardiaque", icon: "❤️" },
];

const PERIODS = [
    { value: "7", label: "7 jours" },
    { value: "30", label: "30 jours" },
    { value: "90", label: "90 jours" },
];

/**
 * Skeleton loader pour section
 */
function SkeletonLoader() {
    return (
        <div style={{ animation: "shimmer 2s infinite" }}>
            <div
                style={{
                    height: "300px",
                    background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                    backgroundSize: "200% 100%",
                    borderRadius: "8px",
                }}
            />
        </div>
    );
}

/**
 * Section Tendance
 */
function TrendSection({ metric, period, data, isLoading }) {
    if (isLoading) return <SkeletonLoader />;
    if (!data || !data.points || data.points.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Pas assez de données pour afficher la tendance</p>
            </div>
        );
    }

    const chartData = data.points.map((p) => ({
        date: new Date(p.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
        value: p.value,
        trend: data.regression_line ? p.value_trend : null,
    }));

    const regressionColor = data.regression.slope > 0 ? "#10b981" : "#ef4444";

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Tendance {METRICS.find(m => m.value === metric)?.label}</h3>
                <div className={styles.regressionInfo}>
                    <span style={{ color: regressionColor, fontWeight: 600, marginRight: "12px" }}>
                        Pente: {data.regression.slope > 0 ? "+" : ""}{data.regression.slope.toFixed(2)} pts/jour
                    </span>
                    <span style={{ color: "#64748b" }}>R² = {data.regression.r_squared.toFixed(3)}</span>
                </div>
            </div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
                        <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0" }}
                            formatter={(value) => value?.toFixed(2)}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            dot={false}
                            name="Valeur"
                            strokeWidth={2}
                        />
                        {data.regression_line && (
                            <Line
                                type="linear"
                                dataKey="trend"
                                stroke={regressionColor}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Régression"
                                strokeWidth={2}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/**
 * Section Prédictions
 */
function PredictionsSection({ data, isLoading }) {
    if (isLoading) return <SkeletonLoader />;
    if (!data) {
        return (
            <div className={styles.emptyState}>
                <p>Pas assez de données pour générer des prédictions</p>
            </div>
        );
    }

    const ArrowIndicator = ({ direction }) => {
        const isUp = direction > 0;
        return (
            <span
                style={{
                    fontSize: "24px",
                    display: "inline-block",
                    animation: isUp ? "slideUp 1s ease-in-out infinite" : "slideDown 1s ease-in-out infinite",
                }}
            >
                {isUp ? "↑" : "↓"}
            </span>
        );
    };

    return (
        <div className={styles.predictionsGrid}>
            <div className={styles.predictionCard}>
                <h4 className={styles.predictionTitle}>Prédiction J+7</h4>
                <div className={styles.predictionValue}>
                    <span className={styles.value}>{data.prediction_7d?.value.toFixed(1)}</span>
                    <ArrowIndicator direction={data.prediction_7d?.trend_direction} />
                </div>
                <div className={styles.confidenceInterval}>
                    [{data.prediction_7d?.confidence_interval_lower.toFixed(1)}, {data.prediction_7d?.confidence_interval_upper.toFixed(1)}]
                </div>
                <div className={styles.confidenceLabel}>IC 95%</div>
            </div>

            <div className={styles.predictionCard}>
                <h4 className={styles.predictionTitle}>Prédiction J+30</h4>
                <div className={styles.predictionValue}>
                    <span className={styles.value}>{data.prediction_30d?.value.toFixed(1)}</span>
                    <ArrowIndicator direction={data.prediction_30d?.trend_direction} />
                </div>
                <div className={styles.confidenceInterval}>
                    [{data.prediction_30d?.confidence_interval_lower.toFixed(1)}, {data.prediction_30d?.confidence_interval_upper.toFixed(1)}]
                </div>
                <div className={styles.confidenceLabel}>IC 95%</div>
            </div>
        </div>
    );
}

/**
 * Section Corrélations
 */
function CorrelationsSection({ data, isLoading }) {
    if (isLoading) return <SkeletonLoader />;
    if (!data) {
        return (
            <div className={styles.emptyState}>
                <p>Pas assez de données pour calculer les corrélations</p>
            </div>
        );
    }

    const getCorrelationStrength = (r) => {
        const abs = Math.abs(r);
        if (abs > 0.7) return { label: "fortement", color: "#dc2626" };
        if (abs > 0.4) return { label: "modérément", color: "#f59e0b" };
        return { label: "faiblement", color: "#10b981" };
    };

    const sleepHRCorr = data.sleep_hr_next_day;
    const activitySleepCorr = data.activity_sleep_next_day;

    return (
        <div className={styles.correlationsGrid}>
            <div className={styles.correlationCard}>
                <h4 className={styles.correlationTitle}>Sommeil ↔ FC (J+1)</h4>
                <div className={styles.correlationBody}>
                    <p>
                        Les nuits courtes sont{" "}
                        <span
                            style={{
                                color: getCorrelationStrength(sleepHRCorr?.coefficient).color,
                                fontWeight: 600,
                            }}
                        >
                            {getCorrelationStrength(sleepHRCorr?.coefficient).label}
                        </span>{" "}
                        corrélées avec une FC élevée le lendemain
                    </p>
                    <div className={styles.correlationCoeff}>
                        r = {sleepHRCorr?.coefficient.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className={styles.correlationCard}>
                <h4 className={styles.correlationTitle}>Activité ↔ Sommeil (J+1)</h4>
                <div className={styles.correlationBody}>
                    <p>
                        Les activités intenses sont{" "}
                        <span
                            style={{
                                color: getCorrelationStrength(activitySleepCorr?.coefficient).color,
                                fontWeight: 600,
                            }}
                        >
                            {getCorrelationStrength(activitySleepCorr?.coefficient).label}
                        </span>{" "}
                        corrélées avec une meilleure qualité de sommeil le lendemain
                    </p>
                    <div className={styles.correlationCoeff}>
                        r = {activitySleepCorr?.coefficient.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Section Résumé Hebdomadaire
 */
function WeeklySummarySection({ data, isLoading }) {
    if (isLoading) return <SkeletonLoader />;
    if (!data || !data.sleep || !data.activity || !data.resting_heart_rate) {
        return (
            <div className={styles.emptyState}>
                <p>Pas assez de données pour le résumé hebdomadaire</p>
            </div>
        );
    }

    const getVariationColor = (value) => value > 0 ? "#10b981" : "#ef4444";
    const fmt = (v, unit) => v ? `${v.toFixed(1)} ${unit}` : "—";
    const fmtPct = (v) => v > 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;

    const sleepCur = data.sleep.current.avg_hours;
    const sleepPrev = data.sleep.previous.avg_hours;
    const actCur = data.activity.current.session_count;
    const actPrev = data.activity.previous.session_count;
    const hrCur = data.resting_heart_rate.current.avg_bpm;
    const hrPrev = data.resting_heart_rate.previous.avg_bpm;

    return (
        <div className={styles.tableSection}>
            <table className={styles.table}>
                <thead className={styles.thead}>
                    <tr>
                        <th className={styles.th}>Métrique</th>
                        <th className={styles.th}>Cette semaine</th>
                        <th className={styles.th}>Semaine précédente</th>
                        <th className={styles.th}>Variation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className={styles.td}>Sommeil moyen</td>
                        <td className={styles.td}>{fmt(sleepCur, "h")}</td>
                        <td className={styles.td}>{fmt(sleepPrev, "h")}</td>
                        <td className={styles.td}>
                            <span style={{ color: getVariationColor(data.sleep.hours_variation_percent) }}>
                                {sleepCur || sleepPrev ? fmtPct(data.sleep.hours_variation_percent) : "—"}
                                {" "}{sleepCur > sleepPrev ? "↑" : sleepCur < sleepPrev ? "↓" : ""}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td className={styles.td}>Activités</td>
                        <td className={styles.td}>{actCur || 0} séances</td>
                        <td className={styles.td}>{actPrev || 0} séances</td>
                        <td className={styles.td}>
                            <span style={{ color: getVariationColor(actCur - actPrev) }}>
                                {actCur - actPrev > 0 ? "+" : ""}{actCur - actPrev}
                                {" "}{actCur > actPrev ? "↑" : actCur < actPrev ? "↓" : ""}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td className={styles.td}>FC au repos</td>
                        <td className={styles.td}>{hrCur ? `${hrCur} bpm` : "—"}</td>
                        <td className={styles.td}>{hrPrev ? `${hrPrev} bpm` : "—"}</td>
                        <td className={styles.td}>
                            <span style={{ color: getVariationColor(hrPrev - hrCur) }}>
                                {hrCur && hrPrev ? fmtPct(data.resting_heart_rate.variation_percent) : "—"}
                                {" "}{hrCur < hrPrev ? "↓" : hrCur > hrPrev ? "↑" : ""}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

/**
 * Page Analyses & Tendances
 */
export default function AnalyticsPage() {
    const { getTrends, getPredictions, getCorrelations, getWeeklySummary } = useAnalytics();
    const [selectedMetric, setSelectedMetric] = useState("sleep_quality");
    const [selectedPeriod, setSelectedPeriod] = useState("30");
    const [trendData, setTrendData] = useState(null);
    const [predictionData, setPredictionData] = useState(null);
    const [correlationData, setCorrelationData] = useState(null);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [isLoadingTrend, setIsLoadingTrend] = useState(false);
    const [isLoadingPred, setIsLoadingPred] = useState(false);
    const [isLoadingCorr, setIsLoadingCorr] = useState(false);
    const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

    // Charger les tendances et prédictions quand les sélections changent
    useEffect(() => {
        loadAnalytics();
    }, [selectedMetric, selectedPeriod]);

    // Charger les corrélations une seule fois
    useEffect(() => {
        loadCorrelations();
    }, []);

    const loadAnalytics = async () => {
        setIsLoadingTrend(true);
        setIsLoadingPred(true);
        setIsLoadingWeekly(true);

        const trends = await getTrends(selectedMetric, selectedPeriod);
        const predictions = await getPredictions(selectedMetric);
        const summary = await getWeeklySummary(selectedMetric);

        setTrendData(trends);
        setPredictionData(predictions);
        setWeeklySummary(summary);

        setIsLoadingTrend(false);
        setIsLoadingPred(false);
        setIsLoadingWeekly(false);
    };

    const loadCorrelations = async () => {
        setIsLoadingCorr(true);
        const correlations = await getCorrelations();
        setCorrelationData(correlations);
        setIsLoadingCorr(false);
    };

    return (
        <Layout pageTitle="Analyses & Tendances">
            <div className={styles.pageContainer}>
                {/* SECTION 1: Sélecteurs */}
                <div className={styles.analyticsControls}>
                    <div className={styles.tabsContainer}>
                        <h3 className={styles.controlLabel}>Métrique</h3>
                        <div className={styles.tabs}>
                            {METRICS.map((m) => (
                                <button
                                    key={m.value}
                                    className={`${styles.tab} ${selectedMetric === m.value ? styles.tabActive : ""}`}
                                    onClick={() => setSelectedMetric(m.value)}
                                >
                                    <span>{m.icon}</span> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.periodContainer}>
                        <h3 className={styles.controlLabel}>Période</h3>
                        <div className={styles.periodButtons}>
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    className={`${styles.periodButton} ${selectedPeriod === p.value ? styles.periodActive : ""}`}
                                    onClick={() => setSelectedPeriod(p.value)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Graphique Tendance */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Tendance</h2>
                    <TrendSection
                        metric={selectedMetric}
                        period={selectedPeriod}
                        data={trendData}
                        isLoading={isLoadingTrend}
                    />
                </div>

                {/* SECTION 3: Prédictions */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        Prédictions
                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal", marginLeft: "8px" }}>
                            Basées sur vos 30 derniers jours
                        </span>
                    </h2>
                    <PredictionsSection data={predictionData} isLoading={isLoadingPred} />
                </div>

                {/* SECTION 4: Corrélations */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Corrélations détectées</h2>
                    <CorrelationsSection data={correlationData} isLoading={isLoadingCorr} />
                </div>

                {/* SECTION 5: Résumé Hebdomadaire */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Résumé hebdomadaire</h2>
                    <WeeklySummarySection data={weeklySummary} isLoading={isLoadingWeekly} />
                </div>
            </div>

            <style>{`
        @keyframes slideUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
        </Layout>
    );
}
