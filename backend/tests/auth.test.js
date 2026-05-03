import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

const API_URL = "http://localhost:4000";
let testUser = null;
let testToken = null;
const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const emailFor = (label) => `auth.${label}.${runId}@example.com`;
const nameFor = (label) => `Auth ${label} ${runId}`;

const signupEmail = emailFor("signup");
const duplicateEmail = emailFor("duplicate");
const weakEmail = emailFor("weak");
const loginEmail = emailFor("login");
const meEmail = emailFor("me");

/**
 * Tests pour les endpoints d'authentification
 */
describe("Authentication Routes", () => {
    // Nettoyer après chaque test
    afterEach(async () => {
        try {
            const pool = global.testPool;
            if (!pool) return;
            await pool.query("DELETE FROM users WHERE email LIKE 'auth.%'");
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== SIGNUP TESTS ====================

    describe("POST /api/auth/signup", () => {
        it("devrait créer un utilisateur avec succès (cas nominal)", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Signup User"),
                email: signupEmail,
                password: "SecurePassword123!",
                age: 30,
                weight: 75,
                height: 180,
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.user");
            expect(res.body.data.user).toHaveProperty("userId");
            expect(res.body.data.user.email).toBe(signupEmail);
            expect(res.body).toHaveProperty("data.token");

            testUser = res.body.data.user;
            testToken = res.body.data.token;
        });

        it("devrait rejeter un email dupliqué", async () => {
            // Créer d'abord un utilisateur
            await request(app).post("/api/auth/signup").send({
                name: nameFor("Duplicate User 1"),
                email: duplicateEmail,
                password: "Password123!",
            });

            // Essayer de créer avec le même email
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Duplicate User 2"),
                email: duplicateEmail,
                password: "Password123!",
            });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toMatch(/email|exists|duplicate/i);
        });

        it("devrait rejeter les champs manquants", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Missing Email"),
                // email manquant
                password: "Password123!",
            });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter un mot de passe faible", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Weak Password"),
                email: weakEmail,
                password: "weak",
            });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });

        it("devrait rejeter un email invalide", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Invalid Email"),
                email: 123,
                password: "SecurePassword123!",
            });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });
    });

    // ==================== LOGIN TESTS ====================

    describe("POST /api/auth/login", () => {
        beforeAll(async () => {
            // Créer un utilisateur de test
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Login User"),
                email: loginEmail,
                password: "SecurePassword123!",
            });
            testUser = res.body.data.user;
        });

        it("devrait logger un utilisateur avec succès (cas nominal)", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: loginEmail,
                password: "SecurePassword123!",
            });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data.token");
            expect(res.body.data).toHaveProperty("user");
            expect(res.body.data.user.email).toBe(loginEmail);

            testToken = res.body.data.token;
        });

        it("devrait rejeter un mauvais mot de passe", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: loginEmail,
                password: "WrongPassword123!",
            });

            expect(res.status).toBe(401);
            expect(res.body.error.message).toMatch(/invalid credentials/i);
        });

        it("devrait rejeter un utilisateur inexistant", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: emailFor("nonexistent"),
                password: "SomePassword123!",
            });

            expect(res.status).toBe(401);
            expect(res.body.error.message).toMatch(/invalid credentials/i);
        });

        it("devrait rejeter email ou password manquant", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: loginEmail,
                // password manquant
            });

            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });
    });

    // ==================== ME ENDPOINT TESTS ====================

    describe("GET /api/auth/me", () => {
        beforeAll(async () => {
            // Créer un utilisateur et récupérer son token
            const res = await request(app).post("/api/auth/signup").send({
                name: nameFor("Me User"),
                email: meEmail,
                password: "SecurePassword123!",
            });
            testUser = res.body.data.user;
            testToken = res.body.data.token;
        });

        it("devrait retourner les données utilisateur avec un token valide", async () => {
            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${testToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data.user.email).toBe(meEmail);
            expect(res.body.data.user.userId).toBe(testUser.userId);
        });

        it("devrait rejeter une requête sans token", async () => {
            const res = await request(app).get("/api/auth/me");

            expect(res.status).toBe(401);
            expect(res.body.error.message).toMatch(/authorization|missing/i);
        });

        it("devrait rejeter un token invalide", async () => {
            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", "Bearer invalid.token.here");

            expect(res.status).toBe(401);
            expect(res.body.error.message).toMatch(/invalid|expired/i);
        });

        it("devrait rejeter un token expiré", async () => {
            // Créer un token expiré (manipulation du JWT)
            const expiredToken =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid";

            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.error.message).toMatch(/invalid|expired/i);
        });
    });
});
