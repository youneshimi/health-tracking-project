import { beforeAll, afterAll } from "@jest/globals";
import mysql from "mysql2/promise";

/**
 * Configuration globale pour les tests
 */
let testPool;

beforeAll(async () => {
    try {
        // Créer une connexion de test avec la base test_health_db
        testPool = mysql.createPool({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "root",
            database: process.env.TEST_DB_NAME || "test_health_db",
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
        });

        console.log("✅ Test pool connecté à test_health_db");
    } catch (err) {
        console.error("❌ Erreur lors de la connexion au pool de test", err);
        process.exit(1);
    }
});

afterAll(async () => {
    if (testPool) {
        await testPool.end();
        console.log("✅ Pool de test fermé");
    }
});

// Exporter le pool pour utilisation dans les tests
global.testPool = testPool;
