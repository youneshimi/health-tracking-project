const mysql = require("mysql2/promise");

/**
 * Configuration globale pour les tests
 */
let testPool;

beforeAll(async () => {
    try {
        testPool = mysql.createPool({
            host: process.env.DB_HOST || "mysql",
            user: process.env.DB_USER || "app",
            password: process.env.DB_PASSWORD || "app",
            database: process.env.TEST_DB_NAME || process.env.DB_NAME || "health_db",
            port: Number(process.env.DB_PORT || 3306),
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
        });

        global.testPool = testPool;
        console.log("✅ Test pool connecté");
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
