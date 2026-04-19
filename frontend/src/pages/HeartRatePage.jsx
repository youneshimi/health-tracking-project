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
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useHeartRate } from "../hooks/useHeartRate";
import client from "../api/client";
import styles from "./DataPages.module.css";

const CONTEXTS = [
    { value: "", label: "Tous les contextes" },
    { value: "resting", label: "Repos" },
    { value: "exercising", label: "Exercice" },
    { value: "stressed", label: "Stress" },
    { value: "sleeping", label: "Sommeil" },
    { value: "other", label: "Autre" },
];

/**
 * Formulaire d'ajout de mesure FC
 */
function HeartRateForm({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        bpm: 70,
        context: "resting",
        timestamp: new Date().toISOString().slice(0, 16),
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "bpm" ? parseInt(value) : value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.bpm || formData.bpm < 30 || formData.bpm > 250)
            newErrors.bpm = "BPM: 30-250";
        if (!formData.context) newErrors.context = "Contexte requis";
        if (!formData.timestamp) newErrors.timestamp = "Date/heure requise";
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        await onSubmit(formData);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    BPM <span className={styles.required}>*</span>
                </label>
                <input
                    type="number"
                    name="bpm"
                    value={formData.bpm}
                    onChange={handleChange}
                    min="30"
                    max="250"
                    className={styles.input}
                />
                {errors.bpm && <div className={styles.error}>{errors.bpm}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Contexte <span className={styles.required}>*</span>
                </label>
                <select
                    name="context"
                    value={formData.context}
                    onChange={handleChange}
                    className={styles.select}
                >
                    {CONTEXTS.slice(1).map((c) => (
                        <option key={c.value} value={c.value}>
                            {c.label}
                        </option>
                    ))}
                </select>
                {errors.context && <div className={styles.error}>{errors.context}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Date/Heure <span className={styles.required}>*</span>
                </label>
                <input
                    type="datetime-local"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleChange}
                    className={styles.input}
                />
                {errors.timestamp && <div className={styles.error}>{errors.timestamp}</div>}
            </div>

            <div className={styles.formActions}>
                <button
                    type="submit"
                    className={styles.buttonPrimary}
                    disabled={isLoading}
                >
                    {isLoading ? "Ajout..." : "Ajouter"}
                </button>
            </div>
        </form>
    );
}

/**
 * Page Fréquence Cardiaque
 */
export default function HeartRatePage() {
    const { heartRateRecords, isLoading, getHeartRateRecords } = useHeartRate();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [filterContext, setFilterContext] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        getHeartRateRecords();
    }, []);

    // Filtrer les mesures des 7 derniers jours
    const sevenDaysData = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return heartRateRecords
            .filter((hr) => new Date(hr.recorded_at) >= sevenDaysAgo)
            .filter((hr) => !filterContext || hr.context === filterContext)
            .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
            .map((hr, idx) => ({
                time: new Date(hr.recorded_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                date: new Date(hr.recorded_at).toLocaleDateString("fr-FR"),
                bpm: hr.bpm,
                context: hr.context,
            }));
    }, [heartRateRecords, filterContext]);

    // Statistiques par contexte
    const contextStats = useMemo(() => {
        const contexts = {};

        heartRateRecords.forEach((hr) => {
            if (!contexts[hr.context]) {
                contexts[hr.context] = [];
            }
            contexts[hr.context].push(hr.bpm);
        });

        return CONTEXTS.slice(1).map((c) => {
            const values = contexts[c.value] || [];
            const min = values.length > 0 ? Math.min(...values) : 0;
            const max = values.length > 0 ? Math.max(...values) : 0;
            const avg = values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(0) : 0;

            return {
                label: c.label,
                min,
                max,
                avg,
                count: values.length,
                color: {
                    resting: "#10b981",
                    exercising: "#ef4444",
                    stressed: "#f59e0b",
                    sleeping: "#3b82f6",
                    other: "#999",
                }[c.value],
            };
        });
    }, [heartRateRecords]);

    const handleAddHeartRate = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                bpm: Number(data.bpm),
                context: data.context || null,
                timestamp: new Date(data.timestamp).toISOString(),
            };
            await client.post("/api/heart-rate", payload);
            addToast("Mesure de FC ajoutée!", "success");
            setShowModal(false);
            await getHeartRateRecords();
        } catch (error) {
            addToast(error.response?.data?.error?.message || error.response?.data?.message || "Erreur", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout pageTitle="Fréquence Cardiaque">
            <div className={styles.pageContainer}>
                {/* Contrôles */}
                <div className={styles.controlsSection}>
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Contexte :</span>
                        <select
                            value={filterContext}
                            onChange={(e) => setFilterContext(e.target.value)}
                            className={styles.select}
                        >
                            {CONTEXTS.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        className={styles.button}
                        onClick={() => setShowModal(true)}
                    >
                        + Ajouter une mesure
                    </button>
                </div>

                {/* Statistiques */}
                <div className={styles.statsGrid}>
                    {contextStats.map((stat) => (
                        <div key={stat.label} className={styles.statCard}>
                            <div className={styles.statHeader} style={{ borderLeftColor: stat.color }}>
                                <h4 className={styles.statLabel}>{stat.label}</h4>
                                <span className={styles.statCount}>{stat.count} mesures</span>
                            </div>
                            <div className={styles.statBody}>
                                <div className={styles.statRow}>
                                    <span>Min</span>
                                    <span className={styles.statValue}>{stat.min} bpm</span>
                                </div>
                                <div className={styles.statRow}>
                                    <span>Max</span>
                                    <span className={styles.statValue}>{stat.max} bpm</span>
                                </div>
                                <div className={styles.statRow}>
                                    <span>Moyenne</span>
                                    <span className={styles.statValue}>{stat.avg} bpm</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Graphique */}
                <div className={styles.chartCard} style={{ marginBottom: "30px" }}>
                    <h3 className={styles.chartTitle}>
                        Fréquence cardiaque sur 7 jours
                        {filterContext && ` (${CONTEXTS.find(c => c.value === filterContext)?.label})`}
                    </h3>
                    <div className={styles.chartContainer}>
                        {sevenDaysData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={sevenDaysData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "11px" }} />
                                    <YAxis domain={[40, 150]} stroke="#64748b" style={{ fontSize: "12px" }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0" }}
                                        formatter={(value) => `${value} bpm`}
                                        labelFormatter={(label) => label}
                                    />
                                    <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" label="Repos optimal" />
                                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label="Exercice" />
                                    <Line
                                        type="monotone"
                                        dataKey="bpm"
                                        stroke="#3b82f6"
                                        dot={false}
                                        isAnimationActive={true}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyChart}>
                                <p>Pas de données pour les 7 derniers jours</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tableau */}
                <div className={styles.tableSection}>
                    <h2 className={styles.sectionTitle}>
                        Dernières mesures ({sevenDaysData.length})
                    </h2>
                    {sevenDaysData.length > 0 ? (
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>Date</th>
                                    <th className={styles.th}>Heure</th>
                                    <th className={styles.th}>BPM</th>
                                    <th className={styles.th}>Contexte</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sevenDaysData.slice(-50).reverse().map((hr, idx) => (
                                    <tr key={idx}>
                                        <td className={styles.td}>{hr.date}</td>
                                        <td className={styles.td}>{hr.time}</td>
                                        <td className={styles.td}>
                                            <span style={{
                                                fontWeight: 600,
                                                color: hr.bpm < 60 ? '#10b981' : hr.bpm < 100 ? '#3b82f6' : '#ef4444'
                                            }}>
                                                {hr.bpm}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.badge} style={{
                                                backgroundColor: {
                                                    resting: '#10b981',
                                                    exercising: '#ef4444',
                                                    stressed: '#f59e0b',
                                                    sleeping: '#3b82f6',
                                                    other: '#999',
                                                }[hr.context] || '#999',
                                                color: 'white'
                                            }}>
                                                {CONTEXTS.find(c => c.value === hr.context)?.label || hr.context}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>❤️</div>
                            <div className={styles.emptyTitle}>Aucune mesure</div>
                            <p>Commencez en ajoutant votre première mesure de fréquence cardiaque</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                title="Ajouter une mesure de FC"
                onClose={() => setShowModal(false)}
                size="small"
            >
                <HeartRateForm onSubmit={handleAddHeartRate} isLoading={isSubmitting} />
            </Modal>
        </Layout>
    );
}
