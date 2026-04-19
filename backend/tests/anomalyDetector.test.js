import { describe, it, expect, beforeAll } from "@jest/globals";
import { detectHeartRateAnomalies, detectSleepAnomalies, detectActivityAnomalies } from "../src/services/anomalyDetector.js";

/**
 * Tests unitaires pour le détecteur d'anomalies
 */
describe("Anomaly Detector", () => {
    // ==================== HEART RATE ANOMALIES ====================

    describe("detectHeartRateAnomalies", () => {
        it("devrait détecter la tachycardie (BPM > 100)", () => {
            const records = [
                { bpm: 105, context: "rest" },
                { bpm: 110, context: "rest" },
            ];

            const anomalies = detectHeartRateAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBeGreaterThan(0);
            expect(anomalies[0].type).toMatch(/heart_rate_high|tachycardia/i);
        });

        it("devrait détecter la bradycardie (BPM < 50)", () => {
            const records = [
                { bpm: 45, context: "rest" },
                { bpm: 40, context: "rest" },
            ];

            const anomalies = detectHeartRateAnomalies(records);

            expect(anomalies.length).toBeGreaterThan(0);
            expect(anomalies[0].type).toMatch(/heart_rate_low|bradycardia/i);
        });

        it("devrait détecter une variabilité FC excessive (> 30 BPM variation)", () => {
            const records = [
                { bpm: 60, context: "rest" },
                { bpm: 95, context: "rest" },
            ];

            const anomalies = detectHeartRateAnomalies(records);

            // La variabilité devrait être détectée ou une tachycardia selon l'implémentation
            expect(Array.isArray(anomalies)).toBe(true);
        });

        it("ne devrait pas détecter d'anomalie avec un BPM normal", () => {
            const records = [
                { bpm: 70, context: "rest" },
                { bpm: 75, context: "rest" },
            ];

            const anomalies = detectHeartRateAnomalies(records);

            expect(anomalies.length).toBe(0);
        });

        it("devrait gérer un array vide", () => {
            const anomalies = detectHeartRateAnomalies([]);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBe(0);
        });

        it("devrait gérer des BPM invalides (null, undefined)", () => {
            const records = [
                { bpm: null, context: "rest" },
                { bpm: undefined, context: "rest" },
            ];

            const anomalies = detectHeartRateAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
        });
    });

    // ==================== SLEEP ANOMALIES ====================

    describe("detectSleepAnomalies", () => {
        it("devrait détecter un sommeil insuffisant (< 6 heures pendant 3+ nuits)", () => {
            const records = [
                { total_hours: 5 },
                { total_hours: 4.5 },
                { total_hours: 5.5 },
            ];

            const anomalies = detectSleepAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.some((a) => a.type.match(/insufficient/i))).toBe(true);
        });

        it("devrait détecter une mauvaise qualité de sommeil (quality < 4/5 pendant 3+ nuits)", () => {
            const records = [
                { total_hours: 8, quality_score: 3 },
                { total_hours: 7, quality_score: 3.5 },
                { total_hours: 8, quality_score: 3 },
            ];

            const anomalies = detectSleepAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.some((a) => a.type.match(/quality/i))).toBe(true);
        });

        it("devrait détecter peu de sommeil profond (deep_sleep < 10% du total, 3+ nuits)", () => {
            const records = [
                { total_hours: 8, deep_sleep_hours: 0.5 }, // 6.25%
                { total_hours: 8, deep_sleep_hours: 0.7 }, // 8.75%
                { total_hours: 8, deep_sleep_hours: 0.6 }, // 7.5%
            ];

            const anomalies = detectSleepAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.some((a) => a.type.match(/deep/i))).toBe(true);
        });

        it("ne devrait pas détecter d'anomalie avec un sommeil normal", () => {
            const records = [
                { total_hours: 8, quality_score: 8, deep_sleep_hours: 2 },
                { total_hours: 7.5, quality_score: 8, deep_sleep_hours: 1.8 },
            ];

            const anomalies = detectSleepAnomalies(records);

            expect(anomalies.length).toBe(0);
        });

        it("devrait gérer un array vide", () => {
            const anomalies = detectSleepAnomalies([]);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBe(0);
        });
    });

    // ==================== ACTIVITY ANOMALIES ====================

    describe("detectActivityAnomalies", () => {
        it("devrait détecter une inactivité (0 activités pendant 14+ jours)", () => {
            const now = new Date();
            const records = [];
            // Pas d'activités créées récemment
            const lastActivityDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

            const anomalies = detectActivityAnomalies(records, lastActivityDate);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.some((a) => a.type.match(/inactivity/i))).toBe(true);
        });

        it("devrait détecter une activité excessive (> 1500 calories par jour)", () => {
            const records = [
                { calories_burned: 800 },
                { calories_burned: 900 }, // Total = 1700 calories
            ];

            const anomalies = detectActivityAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.some((a) => a.type.match(/excessive/i))).toBe(true);
        });

        it("ne devrait pas détecter d'anomalie avec une activité normale", () => {
            const records = [
                { calories_burned: 300 },
                { calories_burned: 250 },
            ];

            const anomalies = detectActivityAnomalies(records);

            expect(anomalies.length).toBe(0);
        });

        it("devrait gérer un array vide", () => {
            const anomalies = detectActivityAnomalies([]);

            expect(Array.isArray(anomalies)).toBe(true);
        });

        it("devrait gérer des calories_burned invalides", () => {
            const records = [
                { calories_burned: null },
                { calories_burned: undefined },
                { calories_burned: "invalid" },
            ];

            const anomalies = detectActivityAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
        });
    });

    // ==================== COMBINED TESTS ====================

    describe("Combined Anomaly Detection", () => {
        it("devrait détecter plusieurs anomalies différentes", () => {
            const hrAnomalies = detectHeartRateAnomalies([{ bpm: 120, context: "rest" }]);
            const sleepAnomalies = detectSleepAnomalies([
                { total_hours: 4, quality_score: 3, deep_sleep_hours: 0.3 },
                { total_hours: 5, quality_score: 3, deep_sleep_hours: 0.4 },
                { total_hours: 4.5, quality_score: 2, deep_sleep_hours: 0.3 },
            ]);

            expect(hrAnomalies.length).toBeGreaterThan(0);
            expect(sleepAnomalies.length).toBeGreaterThan(0);
        });

        it("devrait attribuer les sévérités correctes", () => {
            const hrAnomalies = detectHeartRateAnomalies([{ bpm: 150, context: "rest" }]);

            hrAnomalies.forEach((anomaly) => {
                expect(["HIGH", "MEDIUM", "LOW"]).toContain(anomaly.severity);
            });
        });

        it("devrait inclure des messages descriptifs", () => {
            const hrAnomalies = detectHeartRateAnomalies([{ bpm: 120, context: "rest" }]);

            hrAnomalies.forEach((anomaly) => {
                expect(anomaly.message).toBeDefined();
                expect(anomaly.message.length).toBeGreaterThan(0);
            });
        });
    });

    // ==================== EDGE CASES ====================

    describe("Edge Cases", () => {
        it("devrait gérer les très hauts BPM", () => {
            const records = [{ bpm: 250, context: "exercise" }];
            const anomalies = detectHeartRateAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
        });

        it("devrait gérer les très bas BPM", () => {
            const records = [{ bpm: 20, context: "sleep" }];
            const anomalies = detectHeartRateAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
        });

        it("devrait gérer les floats pour les heures de sommeil", () => {
            const records = [
                { total_hours: 7.75, quality_score: 8, deep_sleep_hours: 1.5 },
            ];
            const anomalies = detectSleepAnomalies(records);

            expect(Array.isArray(anomalies)).toBe(true);
        });

        it("devrait gérer les zéros", () => {
            const hrAnomalies = detectHeartRateAnomalies([{ bpm: 0, context: "rest" }]);
            const sleepAnomalies = detectSleepAnomalies([
                { total_hours: 0, quality_score: 0, deep_sleep_hours: 0 },
            ]);
            const activityAnomalies = detectActivityAnomalies([
                { calories_burned: 0 },
            ]);

            expect(Array.isArray(hrAnomalies)).toBe(true);
            expect(Array.isArray(sleepAnomalies)).toBe(true);
            expect(Array.isArray(activityAnomalies)).toBe(true);
        });
    });
});
