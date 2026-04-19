#!/usr/bin/env node

/**
 * Seed script pour générer 90 jours de données simulées réalistes
 * Usage: node src/scripts/seedData.js <user_id>
 * ou: npm run seed -- <user_id>
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mysql = require("mysql2/promise");

// Couleurs pour le terminal
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
};

// Validation
const userId = parseInt(process.argv[2]);
if (!userId || isNaN(userId) || userId < 1) {
    console.error(`${colors.red}❌ Usage: node src/scripts/seedData.js <user_id>${colors.reset}`);
    process.exit(1);
}

console.log(`\n${colors.cyan}🌱 Health Tracker Data Seeder${colors.reset}`);
console.log(`${colors.cyan}================================${colors.reset}\n`);

// Configuration du pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
});

/**
 * Barre de progression
 */
function showProgress(current, total, label = "Generating") {
    const percentage = Math.round((current / total) * 100);
    const barLength = 40;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    process.stdout.write(`\r${label}: [${bar}] ${percentage}%`);
}

/**
 * Génère une date ISO
 */
function getDateISO(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() - (90 - daysOffset));
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
}

/**
 * Génère un timestamp ISO
 */
function getTimestampISO(daysOffset, hour, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() - (90 - daysOffset));
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

/**
 * Nombre aléatoire avec variation
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Distribution normale (Box-Muller)
 */
function randomNormal(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

/**
 * Génère les activités pour 90 jours
 */
function generateActivities(userId) {
    const activities = [];
    const types = ["running", "walking", "cycling", "gym"];
    const typeWeights = [0.4, 0.3, 0.2, 0.1]; // Répartition

    for (let day = 0; day < 90; day++) {
        // 4-6 activités par semaine
        const dayOfWeek = day % 7;
        const activitiesThisDay = Math.random() > 0.3 ? 1 : 0; // 70% jours actifs

        if (activitiesThisDay) {
            // Sélectionner le type en fonction des poids
            const rand = Math.random();
            let typeIndex = 0;
            let cumulative = 0;
            for (let i = 0; i < typeWeights.length; i++) {
                cumulative += typeWeights[i];
                if (rand < cumulative) {
                    typeIndex = i;
                    break;
                }
            }

            const type = types[typeIndex];
            let duration, distance, calories;

            // Progression: +5% performance chaque semaine
            const progressionFactor = 1 + (day / 90) * 0.05;

            if (type === "running") {
                duration = Math.round(random(20, 60) * progressionFactor);
                distance = parseFloat((random(3, 12) * progressionFactor).toFixed(2));
                calories = Math.round(distance * 100 + random(20, 50));
            } else if (type === "walking") {
                duration = Math.round(random(30, 90) * progressionFactor);
                distance = parseFloat((random(2, 5) * progressionFactor).toFixed(2));
                calories = Math.round(distance * 50 + random(30, 80));
            } else if (type === "cycling") {
                duration = Math.round(random(30, 120) * progressionFactor);
                distance = parseFloat((random(5, 30) * progressionFactor).toFixed(2));
                calories = Math.round(distance * 50 + random(50, 150));
            } else {
                // gym
                duration = Math.round(random(45, 120) * progressionFactor);
                distance = null;
                calories = Math.round(random(300, 600) * progressionFactor);
            }

            activities.push({
                user_id: userId,
                activity_type: type,
                duration_minutes: duration,
                distance_km: distance,
                calories_burned: calories,
                steps: Math.round(duration * 100 + random(200, 500)),
                avg_heart_rate: Math.round(random(110, 160)),
                max_heart_rate: Math.round(random(160, 190)),
                timestamp: getTimestampISO(day, random(6, 20)),
                notes: `${type} activity - Day ${day + 1}`,
            });
        }
    }

    return activities;
}

/**
 * Génère les enregistrements de sommeil
 */
function generateSleepRecords(userId) {
    const sleepRecords = [];

    for (let day = 0; day < 90; day++) {
        const totalHours = randomNormal(7, 1);
        const clampedTotal = Math.max(5.5, Math.min(8.5, totalHours));

        // Distribution des phases : deep 20%, REM 25%, light 55% (±10%)
        const deepPercent = randomNormal(0.2, 0.1);
        const remPercent = randomNormal(0.25, 0.1);
        const lightPercent = 1 - deepPercent - remPercent;

        const deepHours = parseFloat((clampedTotal * deepPercent).toFixed(2));
        const remHours = parseFloat((clampedTotal * remPercent).toFixed(2));
        const lightHours = parseFloat((clampedTotal * lightPercent).toFixed(2));

        // Quality score corrélé avec total_hours
        let qualityScore = Math.round((clampedTotal / 8) * 10);
        qualityScore = Math.max(3, Math.min(10, qualityScore + Math.round(random(-1, 1))));

        sleepRecords.push({
            user_id: userId,
            sleep_date: getDateISO(day),
            total_hours: parseFloat(clampedTotal.toFixed(2)),
            deep_sleep_hours: deepHours,
            light_sleep_hours: lightHours,
            rem_sleep_hours: remHours,
            quality_score: qualityScore,
            notes: `Sleep record - Day ${day + 1}`,
        });
    }

    return sleepRecords;
}

/**
 * Génère les mesures de fréquence cardiaque liées aux activités
 */
function generateHeartRateMeasurements(userId, activities) {
    const measurements = [];

    for (let day = 0; day < 90; day++) {
        // Mesures au repos : matin (7h) et soir (20h)
        measurements.push({
            user_id: userId,
            timestamp: getTimestampISO(day, 7, 0),
            bpm: Math.round(random(60, 80)),
            context: "rest",
            activity_id: null,
            notes: "Morning resting heart rate",
        });

        measurements.push({
            user_id: userId,
            timestamp: getTimestampISO(day, 20, 0),
            bpm: Math.round(random(60, 80)),
            context: "rest",
            activity_id: null,
            notes: "Evening resting heart rate",
        });

        // Mesures pendant les activités
        const dayActivities = activities.filter(a => {
            const actDate = new Date(a.timestamp);
            const seedDate = new Date(getTimestampISO(day, 12, 0));
            return actDate.toDateString() === seedDate.toDateString();
        });

        for (const activity of dayActivities) {
            // 5-10 mesures par activité
            const measurements_count = Math.round(random(5, 10));
            const startHour = Math.floor(parseInt(activity.timestamp.split("T")[1]) || 12);

            for (let i = 0; i < measurements_count; i++) {
                const minute = Math.round((i / measurements_count) * 60);
                const context = activity.activity_type === "gym" ? "exercise" : "exercise";
                const bpm = Math.round(random(130, 170));

                measurements.push({
                    user_id: userId,
                    timestamp: getTimestampISO(day, startHour, minute),
                    bpm: bpm,
                    context: context,
                    activity_id: null, // On ne lie pas les IDs car ils ne sont pas générés
                    notes: `${activity.activity_type} activity`,
                });
            }

            // Récupération post-activité (5-10 min après)
            measurements.push({
                user_id: userId,
                timestamp: new Date(new Date(activity.timestamp).getTime() + 10 * 60000).toISOString(),
                bpm: Math.round(random(100, 130)),
                context: "recovery",
                activity_id: null,
                notes: `Recovery after ${activity.activity_type}`,
            });
        }

        // Anomalies artificielles (5% des mesures)
        if (Math.random() < 0.05) {
            const anomalyBpm = Math.random() > 0.5 ? Math.round(random(40, 59)) : Math.round(random(180, 220));
            measurements.push({
                user_id: userId,
                timestamp: getTimestampISO(day, Math.round(random(8, 22)), Math.round(random(0, 59))),
                bpm: anomalyBpm,
                context: Math.random() > 0.5 ? "rest" : "recovery",
                activity_id: null,
                notes: "Anomaly detected",
            });
        }
    }

    return measurements;
}

/**
 * Insère les données par batch avec transactions
 */
async function insertDataBatch(connection, table, data, userId) {
    const batchSize = 10;
    let inserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
            await connection.beginTransaction();

            for (const record of batch) {
                const columns = Object.keys(record);
                const values = columns.map(col => record[col]);
                const placeholders = columns.map(() => "?").join(", ");

                await connection.query(
                    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
                    values
                );
            }

            await connection.commit();
            inserted += batch.length;
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    return inserted;
}

/**
 * Fonction principale
 */
async function seedData() {
    const connection = await pool.getConnection();

    try {
        console.log(`${colors.yellow}📝 Generating data for user ID: ${userId}${colors.reset}\n`);

        // Vérifier que l'utilisateur existe
        const [user] = await connection.query("SELECT user_id FROM users WHERE user_id = ?", [userId]);
        if (!user.length) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Générer les données
        console.log(`${colors.cyan}1️⃣  Generating activities...${colors.reset}`);
        const activities = generateActivities(userId);
        console.log(`${colors.green}✓ Generated ${activities.length} activities${colors.reset}`);

        console.log(`${colors.cyan}2️⃣  Generating sleep records...${colors.reset}`);
        const sleepRecords = generateSleepRecords(userId);
        console.log(`${colors.green}✓ Generated ${sleepRecords.length} sleep records${colors.reset}`);

        console.log(`${colors.cyan}3️⃣  Generating heart rate measurements...${colors.reset}`);
        const heartRateMeasurements = generateHeartRateMeasurements(userId, activities);
        console.log(`${colors.green}✓ Generated ${heartRateMeasurements.length} heart rate measurements${colors.reset}`);

        // Insérer les données
        console.log(`\n${colors.bright}${colors.cyan}📊 Inserting data into database...${colors.reset}\n`);

        console.log("Inserting activities...");
        showProgress(0, activities.length);
        const activitiesInserted = await insertDataBatch(connection, "activities", activities, userId);
        console.log(`\n${colors.green}✓ Inserted ${activitiesInserted} activities${colors.reset}`);

        console.log("\nInserting sleep records...");
        showProgress(0, sleepRecords.length);
        const sleepInserted = await insertDataBatch(connection, "sleep_records", sleepRecords, userId);
        console.log(`\n${colors.green}✓ Inserted ${sleepInserted} sleep records${colors.reset}`);

        console.log("\nInserting heart rate measurements...");
        const totalHR = heartRateMeasurements.length;
        let hrInserted = 0;
        for (let i = 0; i < totalHR; i += 10) {
            const batch = heartRateMeasurements.slice(i, i + 10);
            hrInserted += await insertDataBatch(connection, "heart_rate", batch, userId);
            showProgress(hrInserted, totalHR);
        }
        console.log(`\n${colors.green}✓ Inserted ${hrInserted} heart rate measurements${colors.reset}`);

        // Résumé
        console.log(`\n${colors.bright}${colors.green}✅ Seed completed successfully!${colors.reset}`);
        console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
        console.log(`   • Activities: ${activitiesInserted}`);
        console.log(`   • Sleep records: ${sleepInserted}`);
        console.log(`   • Heart rate measurements: ${hrInserted}`);
        console.log(`   • Total records: ${activitiesInserted + sleepInserted + hrInserted}`);
        console.log(`\n`);
    } catch (error) {
        console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

// Lancer le script
seedData();
