#!/usr/bin/env node

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const { execSync } = require("child_process");
const path = require("path");

const SEED_EMAIL = "younes@gmail.com";
const SEED_PASSWORD = "123456";
const SEED_USERNAME = "younes";
const SEED_FIRSTNAME = "Younes";
const SEED_LASTNAME = "Shimi";

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
};

async function waitForDB(maxRetries = 30, delayMs = 2000) {
    for (let i = 1; i <= maxRetries; i++) {
        try {
            const conn = await mysql.createConnection(dbConfig);
            await conn.ping();
            await conn.end();
            console.log("✅ Base de données accessible");
            return;
        } catch {
            console.log(`⏳ Attente de la base de données... (${i}/${maxRetries})`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    throw new Error("Impossible de se connecter à la base de données");
}

async function main() {
    await waitForDB();

    const pool = mysql.createPool({ ...dbConfig, connectionLimit: 3, waitForConnections: true });
    let userId;
    let needsSeed;

    try {
        const conn = await pool.getConnection();
        try {
            const [rows] = await conn.query(
                "SELECT user_id FROM users WHERE email = ?",
                [SEED_EMAIL]
            );

            if (rows.length === 0) {
                const hash = await bcrypt.hash(SEED_PASSWORD, 10);
                const [result] = await conn.query(
                    "INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                    [SEED_USERNAME, SEED_EMAIL, hash, SEED_FIRSTNAME, SEED_LASTNAME]
                );
                userId = result.insertId;
                console.log(`✅ Utilisateur créé : ${SEED_EMAIL} (id=${userId})`);
            } else {
                userId = rows[0].user_id;
                console.log(`ℹ️  Utilisateur existant : ${SEED_EMAIL} (id=${userId})`);
            }

            const [[{ cnt }]] = await conn.query(
                "SELECT COUNT(*) AS cnt FROM activities WHERE user_id = ?",
                [userId]
            );
            needsSeed = cnt === 0;
        } finally {
            conn.release();
        }
        if (!needsSeed) {
            console.log(`ℹ️  Données déjà présentes pour user_id=${userId}, seed ignoré.`);
        } else {
            console.log(`🌱 Démarrage du seed pour user_id=${userId}...`);
            execSync(`node ${path.join(__dirname, "seedData.js")} ${userId}`, { stdio: "inherit" });
            console.log("✅ Seed terminé.");
        }

        const anomalyConn = await pool.getConnection();
        try {
            const [[{ anomalyCount }]] = await anomalyConn.query(
                "SELECT COUNT(*) AS anomalyCount FROM anomalies WHERE user_id = ?",
                [userId]
            );

            if (anomalyCount === 0) {
                await anomalyConn.query(
                    `INSERT INTO anomalies (user_id, type, severity, detected_at, description, is_read)
                     VALUES
                     (?, 'heart_rate', 'high', DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Tachycardia at rest detected: 112 bpm', FALSE),
                     (?, 'sleep', 'medium', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Low sleep quality for 5 consecutive nights', FALSE),
                     (?, 'activity', 'low', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Extremely high calories burned in single session: 1650 kcal', FALSE)`,
                    [userId, userId, userId]
                );
                console.log("✅ Anomalies de démonstration ajoutées.");
            } else {
                console.log(`ℹ️  ${anomalyCount} anomalies déjà présentes, ajout ignoré.`);
            }
        } finally {
            anomalyConn.release();
        }
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
