import React, { useState, useEffect, useMemo } from "react";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import Layout from "../components/layout/Layout";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useActivities } from "../hooks/useActivities";
import client from "../api/client";
import styles from "./DataPages.module.css";

const COLORS = {
    running: "#3b82f6",
    cycling: "#8b5cf6",
    swimming: "#06b6d4",
    walking: "#10b981",
    other: "#f59e0b",
};

const ACTIVITY_TYPES = [
    { value: "", label: "Tous les types" },
    { value: "running", label: "Course" },
    { value: "cycling", label: "Cyclisme" },
    { value: "swimming", label: "Natation" },
    { value: "walking", label: "Marche" },
    { value: "other", label: "Autre" },
];

const PERIODS = [
    { value: "7", label: "7 derniers jours" },
    { value: "30", label: "30 derniers jours" },
    { value: "90", label: "90 derniers jours" },
];

/**
 * Formulaire d'ajout d'activité
 */
function ActivityForm({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        type: "running",
        date: new Date().toISOString().split("T")[0],
        duration_minutes: 30,
        distance_km: 5,
        calories_burned: 250,
    });
    const [errors, setErrors] = useState({});
    const { addToast } = useToast();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "type" ? value : parseFloat(value) || value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.type) newErrors.type = "Type requis";
        if (!formData.date) newErrors.date = "Date requise";
        if (!formData.duration_minutes || formData.duration_minutes <= 0)
            newErrors.duration_minutes = "Durée > 0";
        if (!formData.distance_km || formData.distance_km < 0)
            newErrors.distance_km = "Distance >= 0";
        if (!formData.calories_burned || formData.calories_burned <= 0)
            newErrors.calories_burned = "Calories > 0";
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await onSubmit(formData);
        } catch (err) {
            addToast("Erreur lors de l'ajout", "error");
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Type <span className={styles.required}>*</span>
                </label>
                <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={styles.select}
                >
                    {ACTIVITY_TYPES.slice(1).map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
                {errors.type && <div className={styles.error}>{errors.type}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Date <span className={styles.required}>*</span>
                </label>
                <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={styles.input}
                />
                {errors.date && <div className={styles.error}>{errors.date}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Durée (minutes) <span className={styles.required}>*</span>
                </label>
                <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    min="0"
                    className={styles.input}
                />
                {errors.duration_minutes && (
                    <div className={styles.error}>{errors.duration_minutes}</div>
                )}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Distance (km)</label>
                <input
                    type="number"
                    name="distance_km"
                    value={formData.distance_km}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    className={styles.input}
                />
                {errors.distance_km && (
                    <div className={styles.error}>{errors.distance_km}</div>
                )}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Calories brûlées <span className={styles.required}>*</span>
                </label>
                <input
                    type="number"
                    name="calories_burned"
                    value={formData.calories_burned}
                    onChange={handleChange}
                    min="0"
                    className={styles.input}
                />
                {errors.calories_burned && (
                    <div className={styles.error}>{errors.calories_burned}</div>
                )}
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
 * Page Activités
 */
export default function ActivitiesPage() {
    const { activities, isLoading, getActivities } = useActivities();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState("");
    const [filterPeriod, setFilterPeriod] = useState("30");
    const [currentPage, setCurrentPage] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const itemsPerPage = 10;

    // Charger les activités
    useEffect(() => {
        getActivities();
    }, []);

    // Filtrer les activités
    const filteredActivities = useMemo(() => {
        const now = new Date();
        const periodDays = parseInt(filterPeriod);
        const periodDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

        return activities
            .filter((a) => {
                const date = new Date(a.date);
                return date >= periodDate;
            })
            .filter((a) => !filterType || a.type === filterType)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [activities, filterType, filterPeriod]);

    // Paginer
    const paginatedActivities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredActivities.slice(start, start + itemsPerPage);
    }, [filteredActivities, currentPage]);

    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

    // Préparer les données pour les graphiques
    const weeklyDuration = useMemo(() => {
        const data = {};
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            weekStart.setDate(
                weekStart.getDate() - weekStart.getDay()
            );
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const weekLabel = `${weekStart.toLocaleDateString("fr-FR", {
                month: "short",
                day: "numeric",
            })}-${weekEnd.toLocaleDateString("fr-FR", { day: "numeric" })}`;
            data[weekLabel] = 0;
        }

        activities.forEach((a) => {
            const date = new Date(a.date);
            if (date >= new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)) {
                const weekStart = new Date(date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const weekLabel = `${weekStart.toLocaleDateString("fr-FR", {
                    month: "short",
                    day: "numeric",
                })}-${weekEnd.toLocaleDateString("fr-FR", { day: "numeric" })}`;
                if (data[weekLabel] !== undefined) {
                    data[weekLabel] += a.duration_minutes || 0;
                }
            }
        });

        return Object.entries(data).map(([week, duration]) => ({
            week,
            duration,
        }));
    }, [activities]);

    const typeDistribution = useMemo(() => {
        const data = {};
        filteredActivities.forEach((a) => {
            const type = a.type || "other";
            data[type] = (data[type] || 0) + (a.calories_burned || 0);
        });

        return Object.entries(data).map(([type, calories]) => ({
            name: ACTIVITY_TYPES.find((t) => t.value === type)?.label || type,
            value: Math.round(calories),
            fill: COLORS[type] || "#999",
        }));
    }, [filteredActivities]);

    const handleAddActivity = async (data) => {
        setIsSubmitting(true);
        try {
            await client.post("/api/activities", data);
            addToast("Activité ajoutée avec succès!", "success");
            setShowModal(false);
            await getActivities();
        } catch (error) {
            addToast(error.response?.data?.message || "Erreur", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout pageTitle="Activités">
            <div className={styles.pageContainer}>
                {/* Contrôles */}
                <div className={styles.controlsSection}>
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Filtres :</span>
                        <select
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={styles.select}
                        >
                            {ACTIVITY_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterPeriod}
                            onChange={(e) => {
                                setFilterPeriod(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={styles.select}
                        >
                            {PERIODS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        className={styles.button}
                        onClick={() => setShowModal(true)}
                    >
                        + Ajouter une activité
                    </button>
                </div>

                {/* Graphiques */}
                <div className={styles.chartsGrid}>
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Durée par semaine (12 dernières semaines)</h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weeklyDuration}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: "12px" }} />
                                    <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                                    <Tooltip />
                                    <Bar dataKey="duration" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Répartition des calories par type</h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={typeDistribution}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {typeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div className={styles.tableSection}>
                    <h2 className={styles.sectionTitle}>
                        Activités récentes ({filteredActivities.length})
                    </h2>
                    {filteredActivities.length > 0 ? (
                        <>
                            <table className={styles.table}>
                                <thead className={styles.thead}>
                                    <tr>
                                        <th className={styles.th}>Date</th>
                                        <th className={styles.th}>Type</th>
                                        <th className={styles.th}>Durée</th>
                                        <th className={styles.th}>Distance</th>
                                        <th className={styles.th}>Calories</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedActivities.map((activity) => (
                                        <tr key={activity.id}>
                                            <td className={styles.td}>
                                                {new Date(activity.date).toLocaleDateString("fr-FR")}
                                            </td>
                                            <td className={styles.td}>
                                                <span className={styles.badge} style={{ backgroundColor: COLORS[activity.type] || COLORS.other, color: 'white' }}>
                                                    {ACTIVITY_TYPES.find((t) => t.value === activity.type)?.label || activity.type}
                                                </span>
                                            </td>
                                            <td className={styles.td}>{activity.duration_minutes} min</td>
                                            <td className={styles.td}>{activity.distance_km} km</td>
                                            <td className={styles.td}>{activity.calories_burned} kcal</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className={styles.pagination}>
                                    <button
                                        className={styles.pageButton}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        ← Préc
                                    </button>
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i + 1}
                                            className={`${styles.pageButton} ${currentPage === i + 1 ? styles.active : ""
                                                }`}
                                            onClick={() => setCurrentPage(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        className={styles.pageButton}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Suiv →
                                    </button>
                                    <span className={styles.pageInfo}>
                                        Page {currentPage} / {totalPages}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📭</div>
                            <div className={styles.emptyTitle}>Aucune activité</div>
                            <p>Commencez en ajoutant votre première activité</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                title="Ajouter une activité"
                onClose={() => setShowModal(false)}
                size="medium"
            >
                <ActivityForm onSubmit={handleAddActivity} isLoading={isSubmitting} />
            </Modal>
        </Layout>
    );
}
