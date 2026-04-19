import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import mysql from "mysql2/promise";

let userToken = null;
let userId = null;
let otherUserToken = null;
let otherUserId = null;

/**
 * Tests pour les endpoints de sommeil
 */
describe("Sleep Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: "Sleep User 1",
            email: "test.sleep1@example.com",
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.id;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: "Sleep User 2",
            email: "test.sleep2@example.com",
            password: "SecurePassword123!",
        });
        otherUserToken = res2.body.data.token;
        otherUserId = res2.body.data.user.id;
    });

    afterAll(async () => {
        try {
            const pool = mysql.createPool({
                host: process.env.DB_HOST || "localhost",
                user: process.env.DB_USER || "root",
                password: process.env.DB_PASSWORD || "root",
                database: process.env.TEST_DB_NAME || "test_health_db",
            });
            const connection = await pool.getConnection();
            await connection.query("DELETE FROM sleep_records WHERE user_id IN (?, ?)", [userId, otherUserId]);
            connection.release();
            await pool.end();
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== CREATE SLEEP ====================

    describe("POST /api/sleep", () => {
        it("devrait créer un enregistrement de sommeil (cas nominal)", async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 8,
                    deep_sleep_hours: 2,
                    light_sleep_hours: 4,
                    rem_sleep_hours: 2,
                    quality_score: 8,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.id");
            expect(res.body.data.total_hours).toBe(8);
            expect(res.body.data.quality_score).toBe(8);
        });

        it("devrait valider que total_hours = deep + light + rem", async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 10, // ≠ 2 + 3 + 2
                    deep_sleep_hours: 2,
                    light_sleep_hours: 3,
                    rem_sleep_hours: 2,
                    quality_score: 7,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/total.*deep.*light.*rem|invalid/i);
        });

        it("devrait rejeter une qualité invalide (< 1 ou > 10)", async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 7,
                    deep_sleep_hours: 1.5,
                    light_sleep_hours: 4,
                    rem_sleep_hours: 1.5,
                    quality_score: 11, // Invalid
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter sans token", async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app).post("/api/sleep").send({
                sleep_date: today,
                total_hours: 8,
                deep_sleep_hours: 2,
                light_sleep_hours: 4,
                rem_sleep_hours: 2,
                quality_score: 8,
            });

            expect(res.status).toBe(401);
        });
    });

    // ==================== UNIQUENESS CONSTRAINT ====================

    describe("Sleep Uniqueness Constraint", () => {
        it("devrait rejeter deux enregistrements pour la même date (user_id + sleep_date unique)", async () => {
            const today = new Date().toISOString().split("T")[0];

            // Créer le premier enregistrement
            await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 8,
                    deep_sleep_hours: 2,
                    light_sleep_hours: 4,
                    rem_sleep_hours: 2,
                    quality_score: 8,
                });

            // Essayer de créer un deuxième pour la même date
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 7,
                    deep_sleep_hours: 1.5,
                    light_sleep_hours: 3.5,
                    rem_sleep_hours: 2,
                    quality_score: 7,
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/duplicate|already exists|unique|constraint/i);
        });

        it("deux utilisateurs peuvent avoir un enregistrement pour la même date", async () => {
            const today = new Date().toISOString().split("T")[0];

            // User 1
            const res1 = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 8,
                    deep_sleep_hours: 2,
                    light_sleep_hours: 4,
                    rem_sleep_hours: 2,
                    quality_score: 8,
                });

            // User 2
            const res2 = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 7,
                    deep_sleep_hours: 1.5,
                    light_sleep_hours: 3.5,
                    rem_sleep_hours: 2,
                    quality_score: 7,
                });

            expect(res1.status).toBe(201);
            expect(res2.status).toBe(201);
            expect(res1.body.data.id).not.toBe(res2.body.data.id);
        });
    });

    // ==================== READ SLEEP ====================

    describe("GET /api/sleep", () => {
        beforeAll(async () => {
            // Créer 10 enregistrements de sommeil
            for (let i = 0; i < 10; i++) {
                const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0];
                await request(app)
                    .post("/api/sleep")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({
                        sleep_date: date,
                        total_hours: 7 + (i % 3),
                        deep_sleep_hours: 1.5,
                        light_sleep_hours: 3.5,
                        rem_sleep_hours: 2,
                        quality_score: 6 + (i % 4),
                    });
            }
        });

        it("devrait récupérer les enregistrements de sommeil de l'utilisateur", async () => {
            const res = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.sleepRecords)).toBe(true);
            expect(res.body.data.sleepRecords.length).toBeGreaterThan(0);
        });

        it("ne devrait pas retourner les données d'autres utilisateurs", async () => {
            const resUser1 = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`);

            const resUser2 = await request(app)
                .get("/api/sleep")
                .set("Authorization", `Bearer ${otherUserToken}`);

            const user1Ids = resUser1.body.data.sleepRecords.map((s) => s.id);
            const user2Ids = resUser2.body.data.sleepRecords.map((s) => s.id);

            const overlap = user1Ids.filter((id) => user2Ids.includes(id));
            expect(overlap.length).toBe(0);
        });

        it("devrait tester la pagination", async () => {
            const res = await request(app)
                .get("/api/sleep?page=1&limit=5")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.sleepRecords.length).toBeLessThanOrEqual(5);
        });
    });

    // ==================== UPDATE SLEEP ====================

    describe("PUT /api/sleep/:id", () => {
        let testSleepId = null;

        beforeAll(async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 8,
                    deep_sleep_hours: 2,
                    light_sleep_hours: 4,
                    rem_sleep_hours: 2,
                    quality_score: 8,
                });
            testSleepId = res.body.data.id;
        });

        it("devrait mettre à jour un enregistrement de sommeil", async () => {
            const res = await request(app)
                .put(`/api/sleep/${testSleepId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    quality_score: 9,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.quality_score).toBe(9);
        });
    });

    // ==================== DELETE SLEEP ====================

    describe("DELETE /api/sleep/:id", () => {
        let testSleepId = null;

        beforeAll(async () => {
            const today = new Date().toISOString().split("T")[0];
            const res = await request(app)
                .post("/api/sleep")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    sleep_date: today,
                    total_hours: 7,
                    deep_sleep_hours: 1.5,
                    light_sleep_hours: 3.5,
                    rem_sleep_hours: 2,
                    quality_score: 7,
                });
            testSleepId = res.body.data.id;
        });

        it("devrait supprimer un enregistrement de sommeil", async () => {
            const res = await request(app)
                .delete(`/api/sleep/${testSleepId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
        });
    });
});
