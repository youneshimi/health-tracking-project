import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import {
    detectHeartRateAnomalies,
    detectSleepAnomalies,
    detectActivityAnomalies,
    runFullDetection,
} from "../src/services/anomalyDetector.js";

let userId = null;
const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const testEmail = `test.anomaly.${runId}@example.com`;
const testName = `Anomaly User ${runId}`;
const toMysqlTimestamp = (date = new Date()) =>
    date.toISOString().slice(0, 19).replace("T", " ");

const dateWithOffset = (days) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const assertTestPool = () => {
    if (!global.testPool) throw new Error("global.testPool is not initialized");
    return global.testPool;
};

describe("Anomaly Detector", () => {
    beforeAll(async () => {
        const res = await request(app).post("/api/auth/signup").send({
            name: testName,
            email: testEmail,
            password: "SecurePassword123!",
        });
        userId = res.body.data.user.userId;
    });

    beforeEach(async () => {
        if (!userId) return;
        const pool = assertTestPool();
        await pool.query("DELETE FROM anomalies WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM heart_rate WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM sleep_records WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM activities WHERE user_id = ?", [userId]);
    });

    afterAll(async () => {
        if (!userId) return;
        const pool = assertTestPool();
        await pool.query("DELETE FROM anomalies WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM heart_rate WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM sleep_records WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM activities WHERE user_id = ?", [userId]);
        await pool.query("DELETE FROM users WHERE user_id = ?", [userId]);
    });

    describe("detectHeartRateAnomalies", () => {
        it("devrait detecter la tachycardie au repos", async () => {
            const pool = assertTestPool();
            await pool.query(
                "INSERT INTO heart_rate (user_id, bpm, context, timestamp) VALUES (?, ?, ?, ?)",
                [userId, 110, "resting", toMysqlTimestamp()]
            );

            const anomalies = await detectHeartRateAnomalies(userId);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBeGreaterThan(0);
        });

        it("devrait retourner un tableau vide sans donnees", async () => {
            const anomalies = await detectHeartRateAnomalies(userId);
            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBe(0);
        });
    });

    describe("detectSleepAnomalies", () => {
        it("devrait detecter un sommeil insuffisant sur 3 nuits", async () => {
            const pool = assertTestPool();
            const dates = [dateWithOffset(-2), dateWithOffset(-1), dateWithOffset(0)];

            for (const date of dates) {
                await pool.query(
                    "INSERT INTO sleep_records (user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, rem_sleep_hours, quality_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [userId, date, 5, 1, 2, 2, 3]
                );
            }

            const anomalies = await detectSleepAnomalies(userId);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBeGreaterThan(0);
        });

        it("devrait retourner un tableau vide sans donnees", async () => {
            const anomalies = await detectSleepAnomalies(userId);
            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBe(0);
        });
    });

    describe("detectActivityAnomalies", () => {
        it("devrait detecter une inactivite prolongee", async () => {
            const pool = assertTestPool();
            const oldDate = toMysqlTimestamp(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000));
            await pool.query(
                "INSERT INTO activities (user_id, activity_type, duration_minutes, calories_burned, timestamp) VALUES (?, ?, ?, ?, ?)",
                [userId, "running", 30, 200, oldDate]
            );

            const anomalies = await detectActivityAnomalies(userId);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBeGreaterThan(0);
        });

        it("devrait retourner un tableau vide sans donnees", async () => {
            const anomalies = await detectActivityAnomalies(userId);
            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBe(0);
        });
    });

    describe("runFullDetection", () => {
        it("devrait retourner une liste d'anomalies inserees", async () => {
            const pool = assertTestPool();
            await pool.query(
                "INSERT INTO heart_rate (user_id, bpm, context, timestamp) VALUES (?, ?, ?, ?)",
                [userId, 120, "resting", toMysqlTimestamp()]
            );

            const anomalies = await runFullDetection(userId);

            expect(Array.isArray(anomalies)).toBe(true);
            expect(anomalies.length).toBeGreaterThan(0);
        });
    });
});
