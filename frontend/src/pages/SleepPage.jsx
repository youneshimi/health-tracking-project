import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
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
import { useSleep } from "../hooks/useSleep";
import client from "../api/client";
import styles from "./DataPages.module.css";

/**
 * Formulaire d'ajout de sommeil
 */
function SleepForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    sleep_date: new Date().toISOString().split("T")[0],
    total_hours: 7,
    deep_sleep_hours: 1.5,
    light_sleep_hours: 4,
    rem_sleep_hours: 1.5,
    quality_score: 7,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.sleep_date) newErrors.sleep_date = "Date requise";
    if (!formData.total_hours || formData.total_hours <= 0)
      newErrors.total_hours = "Total > 0";
    if (formData.deep_sleep_hours < 0)
      newErrors.deep_sleep_hours = "Deep >= 0";
    if (formData.light_sleep_hours < 0)
      newErrors.light_sleep_hours = "Light >= 0";
    if (formData.rem_sleep_hours < 0)
      newErrors.rem_sleep_hours = "REM >= 0";
    if (!formData.quality_score || formData.quality_score < 1 || formData.quality_score > 10)
      newErrors.quality_score = "Quality: 1-10";
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
          Date <span className={styles.required}>*</span>
        </label>
        <input
          type="date"
          name="sleep_date"
          value={formData.sleep_date}
          onChange={handleChange}
          className={styles.input}
        />
        {errors.sleep_date && <div className={styles.error}>{errors.sleep_date}</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Total (heures) <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          name="total_hours"
          value={formData.total_hours}
          onChange={handleChange}
          min="0"
          step="0.5"
          className={styles.input}
        />
        {errors.total_hours && <div className={styles.error}>{errors.total_hours}</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Sommeil profond (heures)</label>
        <input
          type="number"
          name="deep_sleep_hours"
          value={formData.deep_sleep_hours}
          onChange={handleChange}
          min="0"
          step="0.5"
          className={styles.input}
        />
        {errors.deep_sleep_hours && <div className={styles.error}>{errors.deep_sleep_hours}</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Sommeil léger (heures)</label>
        <input
          type="number"
          name="light_sleep_hours"
          value={formData.light_sleep_hours}
          onChange={handleChange}
          min="0"
          step="0.5"
          className={styles.input}
        />
        {errors.light_sleep_hours && <div className={styles.error}>{errors.light_sleep_hours}</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Sommeil REM (heures)</label>
        <input
          type="number"
          name="rem_sleep_hours"
          value={formData.rem_sleep_hours}
          onChange={handleChange}
          min="0"
          step="0.5"
          className={styles.input}
        />
        {errors.rem_sleep_hours && <div className={styles.error}>{errors.rem_sleep_hours}</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Qualité (1-10) <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          name="quality_score"
          value={formData.quality_score}
          onChange={handleChange}
          min="1"
          max="10"
          className={styles.input}
        />
        {errors.quality_score && <div className={styles.error}>{errors.quality_score}</div>}
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
 * Page Sommeil
 */
export default function SleepPage() {
  const { sleepRecords, isLoading, getSleepRecords } = useSleep();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSleepRecords();
  }, []);

  // Préparer les données pour les graphiques
  const sleepData = useMemo(() => {
    return sleepRecords
      .slice(-30)
      .sort((a, b) => new Date(a.sleep_date) - new Date(b.sleep_date))
      .map((s) => ({
        date: new Date(s.sleep_date).toLocaleDateString("fr-FR", {
          month: "short",
          day: "numeric",
        }),
        deep: s.deep_sleep_hours || 0,
        light: s.light_sleep_hours || 0,
        rem: s.rem_sleep_hours || 0,
        total: s.total_hours || 0,
        quality: s.quality_score || 0,
      }));
  }, [sleepRecords]);

  // Tendance qualité avec régression linéaire
  const qualityTrend = useMemo(() => {
    if (sleepData.length < 2) return sleepData;

    const n = sleepData.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = sleepData.reduce((sum, d) => sum + d.quality, 0);
    const sumXY = sleepData.reduce((sum, d, i) => sum + (i + 1) * d.quality, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return sleepData.map((d, i) => ({
      ...d,
      trend: slope * (i + 1) + intercept,
    }));
  }, [sleepData]);

  // Derniers 10 enregistrements
  const recentSleeps = useMemo(() => {
    return sleepRecords.slice(-10).reverse();
  }, [sleepRecords]);

  const handleAddSleep = async (data) => {
    setIsSubmitting(true);
    try {
      await client.post("/api/sleep", data);
      addToast("Enregistrement de sommeil ajouté!", "success");
      setShowModal(false);
      await getSleepRecords();
    } catch (error) {
      addToast(error.response?.data?.message || "Erreur", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout pageTitle="Sommeil">
      <div className={styles.pageContainer}>
        {/* Contrôles */}
        <div className={styles.controlsSection}>
          <button
            className={styles.button}
            onClick={() => setShowModal(true)}
          >
            + Ajouter un enregistrement
          </button>
        </div>

        {/* Graphiques */}
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Phases du sommeil (30 derniers jours)</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
                  <YAxis domain={[0, 10]} stroke="#64748b" style={{ fontSize: "12px" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deep" stackId="a" fill="#3b82f6" name="Profond" />
                  <Bar dataKey="light" stackId="a" fill="#60a5fa" name="Léger" />
                  <Bar dataKey="rem" stackId="a" fill="#93c5fd" name="REM" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Qualité du sommeil avec tendance</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
                  <YAxis domain={[0, 10]} stroke="#64748b" style={{ fontSize: "12px" }} />
                  <Tooltip />
                  <ReferenceLine y={7} stroke="#10b981" strokeDasharray="3 3" label="Objectif: 7" />
                  <Line type="monotone" dataKey="quality" stroke="#8b5cf6" name="Qualité" dot={false} />
                  <Line type="monotone" dataKey="trend" stroke="#f59e0b" name="Tendance" strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>10 derniers enregistrements</h2>
          {recentSleeps.length > 0 ? (
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Profond</th>
                  <th className={styles.th}>Léger</th>
                  <th className={styles.th}>REM</th>
                  <th className={styles.th}>Qualité</th>
                </tr>
              </thead>
              <tbody>
                {recentSleeps.map((sleep) => (
                  <tr key={sleep.id}>
                    <td className={styles.td}>
                      {new Date(sleep.sleep_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.td}>{sleep.total_hours} h</td>
                    <td className={styles.td}>{sleep.deep_sleep_hours} h</td>
                    <td className={styles.td}>{sleep.light_sleep_hours} h</td>
                    <td className={styles.td}>{sleep.rem_sleep_hours} h</td>
                    <td className={styles.td}>
                      <span style={{
                        color: sleep.quality_score >= 7 ? '#10b981' : sleep.quality_score >= 5 ? '#f59e0b' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {sleep.quality_score}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>😴</div>
              <div className={styles.emptyTitle}>Aucun enregistrement</div>
              <p>Commencez en ajoutant votre premier enregistrement de sommeil</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        title="Ajouter un enregistrement de sommeil"
        onClose={() => setShowModal(false)}
        size="medium"
      >
        <SleepForm onSubmit={handleAddSleep} isLoading={isSubmitting} />
      </Modal>
    </Layout>
  );
}
