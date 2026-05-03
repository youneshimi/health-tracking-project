import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

let userToken = null;
let userId = null;
let otherUserToken = null;
let otherUserId = null;
const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const emailFor = (label) => `test.${label}.${runId}@example.com`;
const nameFor = (label) => `${label} ${runId}`;

const dateWithOffset = (days) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

/**
 * Tests pour les endpoints de sommeil
 */
describe("Sleep Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: nameFor("Sleep User 1"),
            email: emailFor("sleep1"),
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.userId;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: nameFor("Sleep User 2"),
            email: emailFor("sleep2"),
            password: "SecurePassword123!",
        });
        otherUserToken = res2.body.data.token;
        otherUserId = res2.body.data.user.userId;
    });

    afterAll(async () => {
        try {
            const pool = global.testPool;
            if (!pool) return;
            await pool.query("DELETE FROM sleep_records WHERE user_id IN (?, ?)", [userId, otherUserId]);
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== CREATE SLEEP ====================

    describe("POST /api/sleep", () => {
        it("devrait créer un enregistrement de sommeil (cas nominal)", async () => {
            const today = dateWithOffset(0);
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 8,
                    deepSleepHours: 2,
                    lightSleepHours: 4,
                    remSleepHours: 2,
                    qualityScore: 8,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.sleepId");
            expect(res.body.data.totalHours).toBe(8);
            expect(res.body.data.qualityScore).toBe(8);
        });

        it("devrait valider que total_hours = deep + light + rem", async () => {
            const today = dateWithOffset(1);
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 10, // ≠ 2 + 3 + 2
                    deepSleepHours: 2,
                    lightSleepHours: 3,
                    remSleepHours: 2,
                    qualityScore: 7,
                });

            expect(res.status).toBe(400);
                expect(res.body.error.message).toBe("Validation error");
                expect(Array.isArray(res.body.error.details)).toBe(true);
                const hasTotalHoursError = res.body.error.details.some((d) => d.field === "totalHours");
                expect(hasTotalHoursError).toBe(true);
        });

        it("devrait rejeter une qualité invalide (< 1 ou > 10)", async () => {
            const today = dateWithOffset(2);
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 7,
                    deepSleepHours: 1.5,
                    lightSleepHours: 4,
                    remSleepHours: 1.5,
                    qualityScore: 11, // Invalid
                });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter sans token", async () => {
            const today = dateWithOffset(3);
            const res = await request(app).post("/api/sleep").send({
                date: today,
                totalHours: 8,
                deepSleepHours: 2,
                lightSleepHours: 4,
                remSleepHours: 2,
                qualityScore: 8,
            });

            expect(res.status).toBe(401);
        });
    });

    // ==================== UNIQUENESS CONSTRAINT ====================

    describe("Sleep Uniqueness Constraint", () => {
        it("devrait rejeter deux enregistrements pour la même date (user_id + sleep_date unique)", async () => {
            const today = dateWithOffset(4);

            // Créer le premier enregistrement
            await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 8,
                    deepSleepHours: 2,
                    lightSleepHours: 4,
                    remSleepHours: 2,
                    qualityScore: 8,
                });

            // Essayer de créer un deuxième pour la même date
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 7,
                    deepSleepHours: 1.5,
                    lightSleepHours: 3.5,
                    remSleepHours: 2,
                    qualityScore: 7,
                });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toMatch(/duplicate|already exists|unique|constraint/i);
        });

        it("deux utilisateurs peuvent avoir un enregistrement pour la même date", async () => {
            const today = dateWithOffset(5);

            // User 1
            const res1 = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 8,
                    deepSleepHours: 2,
                    lightSleepHours: 4,
                    remSleepHours: 2,
                    qualityScore: 8,
                });

            // User 2
            const res2 = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send({
                    date: today,
                    totalHours: 7,
                    deepSleepHours: 1.5,
                    lightSleepHours: 3.5,
                    remSleepHours: 2,
                    qualityScore: 7,
                });

            expect(res1.status).toBe(201);
            expect(res2.status).toBe(201);
            expect(res1.body.data.sleepId).not.toBe(res2.body.data.sleepId);
        });
    });

    // ==================== READ SLEEP ====================

    describe("GET /api/sleep", () => {
        beforeAll(async () => {
            // Créer 10 enregistrements de sommeil
            for (let i = 0; i < 10; i++) {
                const date = new Date(Date.now() - (30 + i) * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0];
                await request(app)
                    .post("/api/sleep")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({
                        date: date,
                        totalHours: 7 + (i % 3),
                        deepSleepHours: 1.5,
                        lightSleepHours: 3.5,
                        remSleepHours: 2,
                        qualityScore: 6 + (i % 4),
                    });
            }
        });

        it("devrait récupérer les enregistrements de sommeil de l'utilisateur", async () => {
            const res = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("ne devrait pas retourner les données d'autres utilisateurs", async () => {
            const resUser1 = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`);

            const resUser2 = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${otherUserToken}`);

            const user1Ids = resUser1.body.data.map((s) => s.sleep_id);
            const user2Ids = resUser2.body.data.map((s) => s.sleep_id);

            const overlap = user1Ids.filter((id) => user2Ids.includes(id));
            expect(overlap.length).toBe(0);
        });

        it("devrait tester la pagination", async () => {
            const res = await request(app)
                .get("/api/sleep?page=1&limit=5")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    // ==================== UPDATE SLEEP ====================

    describe("PUT /api/sleep/:id", () => {
        let testSleepId = null;

        beforeAll(async () => {
            const today = dateWithOffset(6);
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 8,
                    deepSleepHours: 2,
                    lightSleepHours: 4,
                    remSleepHours: 2,
                    qualityScore: 8,
                });
            testSleepId = res.body.data.sleepId;
        });

        it("devrait mettre à jour un enregistrement de sommeil", async () => {
            const res = await request(app)
                .put(`/api/sleep/${testSleepId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    qualityScore: 9,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.quality_score).toBe(9);
        });
    });

    // ==================== DELETE SLEEP ====================

    describe("DELETE /api/sleep/:id", () => {
        let testSleepId = null;

        beforeAll(async () => {
            const today = dateWithOffset(7);
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    date: today,
                    totalHours: 7,
                    deepSleepHours: 1.5,
                    lightSleepHours: 3.5,
                    remSleepHours: 2,
                    qualityScore: 7,
                });
            testSleepId = res.body.data.sleepId;
        });

        it("devrait supprimer un enregistrement de sommeil", async () => {
            const res = await request(app)
                .delete(`/api/sleep/${testSleepId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
        });
    });
});
