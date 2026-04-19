import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import mysql from "mysql2/promise";

const API_URL = "http://localhost:4000";
let testUser = null;
let testToken = null;

/**
 * Tests pour les endpoints d'authentification
 */
describe("Authentication Routes", () => {
    // Nettoyer après chaque test
    afterEach(async () => {
        try {
            const pool = mysql.createPool({
                host: process.env.DB_HOST || "localhost",
                user: process.env.DB_USER || "root",
                password: process.env.DB_PASSWORD || "root",
                database: process.env.TEST_DB_NAME || "test_health_db",
            });
            const connection = await pool.getConnection();
            await connection.query("DELETE FROM users WHERE email LIKE 'test%'");
            connection.release();
            await pool.end();
        } catch (err) {
            console.error("Erreur lors du nettoyage", err);
        }
    });

    // ==================== SIGNUP TESTS ====================

    describe("POST /api/auth/signup", () => {
        it("devrait créer un utilisateur avec succès (cas nominal)", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: "Test User",
                email: "test.signup@example.com",
                password: "SecurePassword123!",
                age: 30,
                weight: 75,
                height: 180,
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("data.user");
            expect(res.body.data.user).toHaveProperty("id");
            expect(res.body.data.user.email).toBe("test.signup@example.com");
            expect(res.body).toHaveProperty("data.token");

            testUser = res.body.data.user;
            testToken = res.body.data.token;
        });

        it("devrait rejeter un email dupliqué", async () => {
            // Créer d'abord un utilisateur
            await request(app).post("/api/auth/signup").send({
                name: "First User",
                email: "test.duplicate@example.com",
                password: "Password123!",
            });

            // Essayer de créer avec le même email
            const res = await request(app).post("/api/auth/signup").send({
                name: "Second User",
                email: "test.duplicate@example.com",
                password: "Password123!",
            });

            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/email|exists|duplicate/i);
        });

        it("devrait rejeter les champs manquants", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: "Test User",
                // email manquant
                password: "Password123!",
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter un mot de passe faible", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: "Test User",
                email: "test.weak@example.com",
                password: "weak",
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

        it("devrait rejeter un email invalide", async () => {
            const res = await request(app).post("/api/auth/signup").send({
                name: "Test User",
                email: "invalid-email",
                password: "SecurePassword123!",
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });
    });

    // ==================== LOGIN TESTS ====================

    describe("POST /api/auth/login", () => {
        beforeAll(async () => {
            // Créer un utilisateur de test
            const res = await request(app).post("/api/auth/signup").send({
                name: "Login Test User",
                email: "test.login@example.com",
                password: "SecurePassword123!",
            });
            testUser = res.body.data.user;
        });

        it("devrait logger un utilisateur avec succès (cas nominal)", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "test.login@example.com",
                password: "SecurePassword123!",
            });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data.token");
            expect(res.body.data).toHaveProperty("user");
            expect(res.body.data.user.email).toBe("test.login@example.com");

            testToken = res.body.data.token;
        });

        it("devrait rejeter un mauvais mot de passe", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "test.login@example.com",
                password: "WrongPassword123!",
            });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/password|invalid|credentials/i);
        });

        it("devrait rejeter un utilisateur inexistant", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "nonexistent@example.com",
                password: "SomePassword123!",
            });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/user|not found|exists/i);
        });

        it("devrait rejeter email ou password manquant", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "test.login@example.com",
                // password manquant
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });
    });

    // ==================== ME ENDPOINT TESTS ====================

    describe("GET /api/auth/me", () => {
        beforeAll(async () => {
            // Créer un utilisateur et récupérer son token
            const res = await request(app).post("/api/auth/signup").send({
                name: "Me Test User",
                email: "test.me@example.com",
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
            expect(res.body.data.email).toBe("test.me@example.com");
            expect(res.body.data.id).toBe(testUser.id);
        });

        it("devrait rejeter une requête sans token", async () => {
            const res = await request(app).get("/api/auth/me");

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/token|authorization|missing/i);
        });

        it("devrait rejeter un token invalide", async () => {
            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", "Bearer invalid.token.here");

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/token|invalid|expired/i);
        });

        it("devrait rejeter un token expiré", async () => {
            // Créer un token expiré (manipulation du JWT)
            const expiredToken =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid";

            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/token|invalid|expired/i);
        });
    });
});
