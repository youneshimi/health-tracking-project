import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import mysql from "mysql2/promise";

let userToken = null;
let userId = null;
let activityId = null;
let otherUserToken = null;
let otherUserId = null;

/**
 * Tests pour les endpoints d'activités
 */
describe("Activities Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: "Activities User 1",
            email: "test.activities1@example.com",
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.id;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: "Activities User 2",
            email: "test.activities2@example.com",
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
            await connection.query("DELETE FROM activities WHERE user_id IN (?, ?)", [userId, otherUserId]);
            connection.release();
            await pool.end();
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== CREATE ACTIVITY ====================

    describe("POST /api/activities", () => {
        it("devrait créer une activité avec succès (cas nominal)", async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "running",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 30,
                    distance_km: 5,
                    calories_burned: 250,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.id");
            expect(res.body.data.type).toBe("running");
            expect(res.body.data.user_id).toBe(userId);

            activityId = res.body.data.id;
        });

        it("devrait rejeter un type d'activité invalide", async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "invalid_type",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 30,
                    distance_km: 5,
                    calories_burned: 250,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter une durée négative", async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "running",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: -30,
                    distance_km: 5,
                    calories_burned: 250,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter sans token d'authentification", async () => {
            const res = await request(app).post("/api/activities").send({
                type: "running",
                date: new Date().toISOString().split("T")[0],
                duration_minutes: 30,
                distance_km: 5,
                calories_burned: 250,
            });

            expect(res.status).toBe(401);
        });
    });

    // ==================== READ ACTIVITIES ====================

    describe("GET /api/activities", () => {
        beforeAll(async () => {
            // Créer 15 activités pour tester la pagination
            for (let i = 0; i < 15; i++) {
                await request(app)
                    .post("/api/activities")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({
                        type: ["running", "cycling", "swimming", "walking"][i % 4],
                        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .split("T")[0],
                        duration_minutes: 30 + i * 5,
                        distance_km: 5,
                        calories_burned: 250 + i * 10,
                    });
            }
        });

        it("devrait récupérer les activités de l'utilisateur", async () => {
            const res = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data.activities");
            expect(Array.isArray(res.body.data.activities)).toBe(true);
            expect(res.body.data.activities.length).toBeGreaterThan(0);
        });

        it("devrait tester la pagination (page 1, limit 10)", async () => {
            const res = await request(app)
                .get("/api/activities?page=1&limit=10")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.activities.length).toBeLessThanOrEqual(10);
            expect(res.body.data).toHaveProperty("totalPages");
            expect(res.body.data).toHaveProperty("currentPage", 1);
        });

        it("devrait tester la pagination (page 2)", async () => {
            const res = await request(app)
                .get("/api/activities?page=2&limit=10")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.currentPage).toBe(2);
        });

        it("devrait filtrer par type d'activité", async () => {
            const res = await request(app)
                .get("/api/activities?type=running")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const allRunning = res.body.data.activities.every((a) => a.type === "running");
            expect(allRunning).toBe(true);
        });

        it("ne devrait pas retourner les activités d'autres utilisateurs", async () => {
            const resUser1 = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${userToken}`);

            const resUser2 = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${otherUserToken}`);

            const user1Ids = resUser1.body.data.activities.map((a) => a.id);
            const user2Ids = resUser2.body.data.activities.map((a) => a.id);

            const overlap = user1Ids.filter((id) => user2Ids.includes(id));
            expect(overlap.length).toBe(0);
        });
    });

    // ==================== OWNERSHIP TESTS ====================

    describe("Activity Ownership", () => {
        it("l'utilisateur A ne peut pas voir les données de l'utilisateur B", async () => {
            // Créer une activité pour user 1
            const createRes = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "running",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 30,
                    distance_km: 5,
                    calories_burned: 250,
                });

            const actId = createRes.body.data.id;

            // Essayer d'accéder avec user 2
            const res = await request(app)
                .get(`/api/activities/${actId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/forbidden|permission|unauthorized/i);
        });
    });

    // ==================== UPDATE ACTIVITY ====================

    describe("PUT /api/activities/:id", () => {
        let testActivityId = null;

        beforeAll(async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "running",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 30,
                    distance_km: 5,
                    calories_burned: 250,
                });
            testActivityId = res.body.data.id;
        });

        it("devrait mettre à jour une activité", async () => {
            const res = await request(app)
                .put(`/api/activities/${testActivityId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    duration_minutes: 45,
                    calories_burned: 350,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.duration_minutes).toBe(45);
            expect(res.body.data.calories_burned).toBe(350);
        });

        it("ne devrait pas permettre à un autre utilisateur de mettre à jour", async () => {
            const res = await request(app)
                .put(`/api/activities/${testActivityId}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send({
                    duration_minutes: 60,
                });

            expect(res.status).toBe(403);
        });
    });

    // ==================== DELETE ACTIVITY ====================

    describe("DELETE /api/activities/:id", () => {
        let testActivityId = null;

        beforeAll(async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "cycling",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 60,
                    distance_km: 20,
                    calories_burned: 500,
                });
            testActivityId = res.body.data.id;
        });

        it("devrait supprimer une activité", async () => {
            const res = await request(app)
                .delete(`/api/activities/${testActivityId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);

            // Vérifier que l'activité est supprimée
            const getRes = await request(app)
                .get(`/api/activities/${testActivityId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(getRes.status).toBe(404);
        });

        it("ne devrait pas permettre à un autre utilisateur de supprimer", async () => {
            // Créer une activité
            const createRes = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    type: "walking",
                    date: new Date().toISOString().split("T")[0],
                    duration_minutes: 20,
                    distance_km: 2,
                    calories_burned: 100,
                });

            const actId = createRes.body.data.id;

            // Essayer de supprimer avec un autre utilisateur
            const res = await request(app)
                .delete(`/api/activities/${actId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(403);
        });
    });
});
