import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

let userToken = null;
let userId = null;
let activityId = null;
let otherUserToken = null;
let otherUserId = null;
const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const emailFor = (label) => `test.${label}.${runId}@example.com`;
const nameFor = (label) => `${label} ${runId}`;

/**
 * Tests pour les endpoints d'activités
 */
describe("Activities Routes", () => {
    beforeAll(async () => {
        // Créer deux utilisateurs de test
        const res1 = await request(app).post("/api/auth/signup").send({
            name: nameFor("Activities User 1"),
            email: emailFor("activities1"),
            password: "SecurePassword123!",
        });
        userToken = res1.body.data.token;
        userId = res1.body.data.user.userId;

        const res2 = await request(app).post("/api/auth/signup").send({
            name: nameFor("Activities User 2"),
            email: emailFor("activities2"),
            password: "SecurePassword123!",
        });
        otherUserToken = res2.body.data.token;
        otherUserId = res2.body.data.user.userId;
    });

    afterAll(async () => {
        try {
            const pool = global.testPool;
            if (!pool) return;
            await pool.query("DELETE FROM activities WHERE user_id IN (?, ?)", [userId, otherUserId]);
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
                    activityType: "running",
                    durationMinutes: 30,
                    distanceKm: 5,
                    caloriesBurned: 250,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.activityId");
            expect(res.body.data.activityType).toBe("running");
            expect(res.body.data.userId).toBe(userId);

            activityId = res.body.data.activityId;
        });

        it("devrait rejeter un type d'activité invalide", async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    activityType: "invalid_type",
                    durationMinutes: 30,
                    distanceKm: 5,
                    caloriesBurned: 250,
                });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter une durée négative", async () => {
            const res = await request(app)
                .post("/api/activities")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    activityType: "running",
                    durationMinutes: -30,
                    distanceKm: 5,
                    caloriesBurned: 250,
                });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter sans token d'authentification", async () => {
            const res = await request(app).post("/api/activities").send({
                activityType: "running",
                durationMinutes: 30,
                distanceKm: 5,
                caloriesBurned: 250,
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
                        activityType: ["running", "cycling", "swimming", "walking"][i % 4],
                        durationMinutes: 30 + i * 5,
                        distanceKm: 5,
                        caloriesBurned: 250 + i * 10,
                    });
            }
        });

        it("devrait récupérer les activités de l'utilisateur", async () => {
            const res = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("devrait tester la pagination (page 1, limit 10)", async () => {
            const res = await request(app)
                .get("/api/activities?page=1&limit=10")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(10);
            expect(res.body.meta).toHaveProperty("totalPages");
            expect(res.body.meta).toHaveProperty("page", 1);
        });

        it("devrait tester la pagination (page 2)", async () => {
            const res = await request(app)
                .get("/api/activities?page=2&limit=10")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.meta.page).toBe(2);
        });

        it("devrait filtrer par type d'activité", async () => {
            const res = await request(app)
                .get("/api/activities?activityType=running")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const allRunning = res.body.data.every((a) => a.activity_type === "running");
            expect(allRunning).toBe(true);
        });

        it("ne devrait pas retourner les activités d'autres utilisateurs", async () => {
            const resUser1 = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${userToken}`);

            const resUser2 = await request(app)
                .get("/api/activities")
                .set("Authorization", `Bearer ${otherUserToken}`);

            const user1Ids = resUser1.body.data.map((a) => a.activity_id);
            const user2Ids = resUser2.body.data.map((a) => a.activity_id);

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
                    activityType: "running",
                    durationMinutes: 30,
                    distanceKm: 5,
                    caloriesBurned: 250,
                });

            const actId = createRes.body.data.activityId;

            // Essayer d'accéder avec user 2
            const res = await request(app)
                .get(`/api/activities/${actId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(404);
            expect(res.body.error.message).toMatch(/not found/i);
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
                    activityType: "running",
                    durationMinutes: 30,
                    distanceKm: 5,
                    caloriesBurned: 250,
                });
            testActivityId = res.body.data.activityId;
        });

        it("devrait mettre à jour une activité", async () => {
            const res = await request(app)
                .put(`/api/activities/${testActivityId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    activityType: "running",
                    durationMinutes: 45,
                    caloriesBurned: 350,
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
                    activityType: "running",
                    durationMinutes: 60,
                });

            expect(res.status).toBe(404);
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
                    activityType: "cycling",
                    durationMinutes: 60,
                    distanceKm: 20,
                    caloriesBurned: 500,
                });
            testActivityId = res.body.data.activityId;
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
                    activityType: "walking",
                    durationMinutes: 20,
                    distanceKm: 2,
                    caloriesBurned: 100,
                });

            const actId = createRes.body.data.activityId;

            // Essayer de supprimer avec un autre utilisateur
            const res = await request(app)
                .delete(`/api/activities/${actId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(404);
        });
    });
});
