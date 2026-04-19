import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import mysql from "mysql2/promise";

let userToken = null;
let userId = null;
let otherUserToken = null;
let otherUserId = null;

/**
 * Tests pour les endpoints de fréquence cardiaque
 */
describe("Heart Rate Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: "HeartRate User 1",
            email: "test.hr1@example.com",
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.id;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: "HeartRate User 2",
            email: "test.hr2@example.com",
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
            await connection.query("DELETE FROM heart_rate_records WHERE user_id IN (?, ?)", [userId, otherUserId]);
            connection.release();
            await pool.end();
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== CREATE HEART RATE ====================

    describe("POST /api/heart-rate", () => {
        it("devrait créer un enregistrement de FC (cas nominal)", async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "rest",
                    recorded_at: new Date().toISOString(),
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.id");
            expect(res.body.data.bpm).toBe(75);
            expect(res.body.data.context).toBe("rest");
        });

        it("devrait rejeter un BPM invalide (< 30 ou > 250)", async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 300,
                    context: "exercise",
                    recorded_at: new Date().toISOString(),
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter un contexte invalide", async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "invalid_context",
                    recorded_at: new Date().toISOString(),
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter sans token", async () => {
            const res = await request(app).post("/api/heart-rate").send({
                bpm: 75,
                context: "rest",
                recorded_at: new Date().toISOString(),
            });

            expect(res.status).toBe(401);
        });
    });

    // ==================== BATCH INSERT ====================

    describe("POST /api/heart-rate/batch", () => {
        it("devrait insérer un batch de mesures (cas nominal)", async () => {
            const now = Date.now();
            const records = [
                { bpm: 70, context: "rest", recorded_at: new Date(now).toISOString() },
                { bpm: 75, context: "rest", recorded_at: new Date(now - 60000).toISOString() },
                { bpm: 80, context: "rest", recorded_at: new Date(now - 120000).toISOString() },
            ];

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.insertedCount");
            expect(res.body.data.insertedCount).toBe(3);
        });

        it("devrait rejeter un batch avec > 100 records", async () => {
            const records = Array.from({ length: 101 }, (_, i) => ({
                bpm: 70 + (i % 20),
                context: "rest",
                recorded_at: new Date(Date.now() - i * 60000).toISOString(),
            }));

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/max|limit|100/i);
        });

        it("devrait rollback le batch en cas d'erreur", async () => {
            const records = [
                { bpm: 70, context: "rest", recorded_at: new Date().toISOString() },
                { bpm: 350, context: "rest", recorded_at: new Date().toISOString() }, // Invalid
            ];

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });
    });

    // ==================== READ HEART RATE ====================

    describe("GET /api/heart-rate", () => {
        beforeAll(async () => {
            // Créer 20 mesures de FC
            for (let i = 0; i < 20; i++) {
                const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
                await request(app)
                    .post("/api/heart-rate")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({
                        bpm: 60 + (i % 30),
                        context: ["rest", "exercise", "recovery", "sleep"][i % 4],
                        recorded_at: timestamp.toISOString(),
                    });
            }
        });

        it("devrait récupérer les mesures de FC de l'utilisateur", async () => {
            const res = await request(app)
                .get("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("devrait filtrer par contexte", async () => {
            const res = await request(app)
                .get("/api/heart-rate?context=rest")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const allRest = res.body.data.every((r) => r.context === "rest");
            expect(allRest).toBe(true);
        });

        it("devrait tester la pagination", async () => {
            const res = await request(app)
                .get("/api/heart-rate?limit=5")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(5);
        });

        it("ne devrait pas retourner les données d'autres utilisateurs", async () => {
            const resUser1 = await request(app)
                .get("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`);

            const resUser2 = await request(app)
                .get("/api/heart-rate")
                .set("Authorization", `Bearer ${otherUserToken}`);

            const user1Ids = resUser1.body.data.map((r) => r.id);
            const user2Ids = resUser2.body.data.map((r) => r.id);

            const overlap = user1Ids.filter((id) => user2Ids.includes(id));
            expect(overlap.length).toBe(0);
        });

        it("devrait filtrer par plage de BPM", async () => {
            const res = await request(app)
                .get("/api/heart-rate?minBpm=70&maxBpm=85")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const allInRange = res.body.data.every((r) => r.bpm >= 70 && r.bpm <= 85);
            if (res.body.data.length > 0) {
                expect(allInRange).toBe(true);
            }
        });
    });

    // ==================== UPDATE HEART RATE ====================

    describe("PUT /api/heart-rate/:id", () => {
        let testHrId = null;

        beforeAll(async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "rest",
                    recorded_at: new Date().toISOString(),
                });
            testHrId = res.body.data.id;
        });

        it("devrait mettre à jour un enregistrement de FC", async () => {
            const res = await request(app)
                .put(`/api/heart-rate/${testHrId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 80,
                    context: "exercise",
                });

            expect(res.status).toBe(200);
            expect(res.body.data.bpm).toBe(80);
            expect(res.body.data.context).toBe("exercise");
        });

        it("ne devrait pas permettre à un autre utilisateur de mettre à jour", async () => {
            const res = await request(app)
                .put(`/api/heart-rate/${testHrId}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send({
                    bpm: 90,
                });

            expect(res.status).toBe(403);
        });
    });

    // ==================== DELETE HEART RATE ====================

    describe("DELETE /api/heart-rate/:id", () => {
        let testHrId = null;

        beforeAll(async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "rest",
                    recorded_at: new Date().toISOString(),
                });
            testHrId = res.body.data.id;
        });

        it("devrait supprimer un enregistrement de FC", async () => {
            const res = await request(app)
                .delete(`/api/heart-rate/${testHrId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
        });

        it("ne devrait pas permettre à un autre utilisateur de supprimer", async () => {
            const createRes = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "rest",
                    recorded_at: new Date().toISOString(),
                });

            const res = await request(app)
                .delete(`/api/heart-rate/${createRes.body.data.id}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(403);
        });
    });

    // ==================== STATS ====================

    describe("GET /api/heart-rate/stats", () => {
        it("devrait récupérer les statistiques de FC", async () => {
            const res = await request(app)
                .get("/api/heart-rate/stats")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("min");
            expect(res.body.data).toHaveProperty("max");
            expect(res.body.data).toHaveProperty("avg");
        });
    });
});
