import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/layout/Layout";
import { useAnomalies } from "../hooks/useAnomalies";
import styles from "./DataPages.module.css";

const SEVERITY_COLORS = {
    HIGH: "#dc2626",
    MEDIUM: "#f59e0b",
    LOW: "#10b981",
};

const SEVERITY_LABELS = {
    HIGH: "Critique",
    MEDIUM: "Modérée",
    LOW: "Faible",
};

const ANOMALY_TYPES = {
    heart_rate_high: { label: "FC Élevée", icon: "❤️‍🔥", category: "heart_rate" },
    heart_rate_low: { label: "FC Basse", icon: "🫀", category: "heart_rate" },
    heart_rate_variability: { label: "Variabilité FC", icon: "📈", category: "heart_rate" },
    insufficient_sleep: { label: "Sommeil Insuffisant", icon: "😴", category: "sleep" },
    poor_sleep_quality: { label: "Qualité de Sommeil", icon: "😓", category: "sleep" },
    low_deep_sleep: { label: "Peu de Sommeil Profond", icon: "💤", category: "sleep" },
    inactivity_alert: { label: "Inactivité", icon: "🛋️", category: "activity" },
    excessive_activity: { label: "Activité Excessive", icon: "🏃", category: "activity" },
};

/**
 * Section Filtres
 */
function FilterSection({ filters, setFilters }) {
    return (
        <div className={styles.controlsSection}>
            <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Filtres :</span>
                <select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                    className={styles.select}
                >
                    <option value="">Toutes les sévérités</option>
                    <option value="HIGH">Critique</option>
                    <option value="MEDIUM">Modérée</option>
                    <option value="LOW">Faible</option>
                </select>
                <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className={styles.select}
                >
                    <option value="">Toutes les catégories</option>
                    <option value="heart_rate">Fréquence Cardiaque</option>
                    <option value="sleep">Sommeil</option>
                    <option value="activity">Activité</option>
                </select>
            </div>
        </div>
    );
}

/**
 * Carte Anomalie
 */
function AnomalyCard({ anomaly }) {
    const type = ANOMALY_TYPES[anomaly.type] || { label: anomaly.type, icon: "❓", category: "other" };
    const timestamp = new Date(anomaly.created_at);

    return (
        <div
            className={styles.anomalyCard}
            style={{
                borderLeftColor: SEVERITY_COLORS[anomaly.severity],
            }}
        >
            <div className={styles.anomalyHeader}>
                <div className={styles.anomalyTitleGroup}>
                    <span className={styles.anomalyIcon}>{type.icon}</span>
                    <div>
                        <h3 className={styles.anomalyTitle}>{type.label}</h3>
                        <p className={styles.anomalyType}>{anomaly.type}</p>
                    </div>
                </div>
                <span
                    className={styles.severityBadge}
                    style={{
                        backgroundColor: SEVERITY_COLORS[anomaly.severity],
                        color: "white",
                    }}
                >
                    {SEVERITY_LABELS[anomaly.severity]}
                </span>
            </div>

            <p className={styles.anomalyMessage}>{anomaly.message}</p>

            <div className={styles.anomalyFooter}>
                <span className={styles.anomalyTime}>
                    {timestamp.toLocaleDateString("fr-FR")} à {timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={styles.anomalyMetric}>{anomaly.metric_type || "—"}</span>
            </div>
        </div>
    );
}

/**
 * Page Anomalies
 */
export default function AnomaliesPage() {
    const { getAnomalies } = useAnomalies();
    const [anomalies, setAnomalies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({ severity: "", category: "" });

    useEffect(() => {
        loadAnomalies();
    }, []);

    const loadAnomalies = async () => {
        setIsLoading(true);
        try {
            const data = await getAnomalies(100);
            setAnomalies(data || []);
        } catch (err) {
            console.error("Erreur lors du chargement des anomalies", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Appliquer les filtres
    const filteredAnomalies = useMemo(() => {
        return anomalies.filter((a) => {
            if (filters.severity && a.severity !== filters.severity) return false;
            if (filters.category) {
                const type = ANOMALY_TYPES[a.type];
                if (type?.category !== filters.category) return false;
            }
            return true;
        });
    }, [anomalies, filters]);

    // Statistiques
    const stats = useMemo(() => {
        return {
            total: anomalies.length,
            high: anomalies.filter((a) => a.severity === "HIGH").length,
            medium: anomalies.filter((a) => a.severity === "MEDIUM").length,
            low: anomalies.filter((a) => a.severity === "LOW").length,
        };
    }, [anomalies]);

    return (
        <Layout pageTitle="Anomalies">
            <div className={styles.pageContainer}>
                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader} style={{ borderLeftColor: "#3b82f6" }}>
                            <h4 className={styles.statLabel}>Total</h4>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statRow}>
                                <span className={styles.statValue}>{stats.total}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statHeader} style={{ borderLeftColor: SEVERITY_COLORS.HIGH }}>
                            <h4 className={styles.statLabel}>Critiques</h4>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statRow}>
                                <span className={styles.statValue} style={{ color: SEVERITY_COLORS.HIGH }}>
                                    {stats.high}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statHeader} style={{ borderLeftColor: SEVERITY_COLORS.MEDIUM }}>
                            <h4 className={styles.statLabel}>Modérées</h4>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statRow}>
                                <span className={styles.statValue} style={{ color: SEVERITY_COLORS.MEDIUM }}>
                                    {stats.medium}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statHeader} style={{ borderLeftColor: SEVERITY_COLORS.LOW }}>
                            <h4 className={styles.statLabel}>Faibles</h4>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statRow}>
                                <span className={styles.statValue} style={{ color: SEVERITY_COLORS.LOW }}>
                                    {stats.low}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <FilterSection filters={filters} setFilters={setFilters} />

                {/* Liste Anomalies */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        Anomalies détectées ({filteredAnomalies.length})
                    </h2>

                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                            Chargement...
                        </div>
                    ) : filteredAnomalies.length > 0 ? (
                        <div className={styles.anomaliesGrid}>
                            {filteredAnomalies.map((anomaly) => (
                                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>✨</div>
                            <div className={styles.emptyTitle}>Aucune anomalie</div>
                            <p>Tout va bien ! Continuez à maintenir vos habitudes de santé</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
