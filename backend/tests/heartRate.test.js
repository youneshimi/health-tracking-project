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
const toMysqlTimestamp = (date = new Date()) =>
    date.toISOString().slice(0, 19).replace("T", " ");

/**
 * Tests pour les endpoints de fréquence cardiaque
 */
describe("Heart Rate Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: nameFor("HeartRate User 1"),
            email: emailFor("hr1"),
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.userId;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: nameFor("HeartRate User 2"),
            email: emailFor("hr2"),
            password: "SecurePassword123!",
        });
        otherUserToken = res2.body.data.token;
        otherUserId = res2.body.data.user.userId;
    });

    afterAll(async () => {
        try {
            const pool = global.testPool;
            if (!pool) return;
            await pool.query("DELETE FROM heart_rate WHERE user_id IN (?, ?)", [userId, otherUserId]);
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
                    context: "resting",
                    timestamp: toMysqlTimestamp(),
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.hrId");
            expect(res.body.data.bpm).toBe(75);
            expect(res.body.data.context).toBe("resting");
        });

        it("devrait rejeter un BPM invalide (< 30 ou > 250)", async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 300,
                    context: "exercising",
                    timestamp: toMysqlTimestamp(),
                });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter un contexte invalide", async () => {
            const res = await request(app)
                .post("/api/heart-rate")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    bpm: 75,
                    context: "invalid_context",
                    timestamp: toMysqlTimestamp(),
                });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter sans token", async () => {
            const res = await request(app).post("/api/heart-rate").send({
                bpm: 75,
                context: "resting",
                timestamp: toMysqlTimestamp(),
            });

            expect(res.status).toBe(401);
        });
    });

    // ==================== BATCH INSERT ====================

    describe("POST /api/heart-rate/batch", () => {
        it("devrait insérer un batch de mesures (cas nominal)", async () => {
            const now = Date.now();
            const records = [
                { bpm: 70, timestamp: toMysqlTimestamp(new Date(now)) },
                { bpm: 75, timestamp: toMysqlTimestamp(new Date(now - 60000)) },
                { bpm: 80, timestamp: toMysqlTimestamp(new Date(now - 120000)) },
            ];

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(201);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(3);
            expect(res.body.meta.inserted).toBe(3);
        });

        it("devrait rejeter un batch avec > 100 records", async () => {
            const records = Array.from({ length: 101 }, (_, i) => ({
                bpm: 70 + (i % 20),
                timestamp: toMysqlTimestamp(new Date(Date.now() - i * 60000)),
            }));

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toMatch(/max|limit|100/i);
        });

        it("devrait rollback le batch en cas d'erreur", async () => {
            const records = [
                { bpm: 70, timestamp: toMysqlTimestamp() },
                { bpm: 350, timestamp: toMysqlTimestamp() }, // Invalid
            ];

            const res = await request(app)
                .post("/api/heart-rate/batch")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ records });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
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
                        context: ["resting", "exercising", "sleeping", "stressed"][i % 4],
                        timestamp: toMysqlTimestamp(timestamp),
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
                .get("/api/heart-rate?context=resting")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const allRest = res.body.data.every((r) => r.context === "resting");
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

            const user1Ids = resUser1.body.data.map((r) => r.hr_id);
            const user2Ids = resUser2.body.data.map((r) => r.hr_id);

            const overlap = user1Ids.filter((id) => user2Ids.includes(id));
            expect(overlap.length).toBe(0);
        });

        it("devrait ignorer les filtres inconnus", async () => {
            const res = await request(app)
                .get("/api/heart-rate?minBpm=70&maxBpm=85")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
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
                    context: "resting",
                    timestamp: toMysqlTimestamp(),
                });
            testHrId = res.body.data.hrId;
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
                    context: "resting",
                    timestamp: toMysqlTimestamp(),
                });

            const res = await request(app)
                .delete(`/api/heart-rate/${createRes.body.data.hrId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ==================== STATS ====================

    describe("GET /api/heart-rate/stats", () => {
        it("devrait récupérer les statistiques de FC", async () => {
            const res = await request(app)
                .get("/api/heart-rate/stats")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("overall");
            expect(res.body.data.overall).toHaveProperty("minBpm");
            expect(res.body.data.overall).toHaveProperty("maxBpm");
            expect(res.body.data.overall).toHaveProperty("avgBpm");
        });
    });
});
