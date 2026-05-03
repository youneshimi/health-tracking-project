#!/usr/bin/env node

/**
 * Seed script pour générer 90 jours de données simulées réalistes
 * Usage: node src/scripts/seedData.js <user_id>
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mysql = require("mysql2/promise");

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
};

const userId = parseInt(process.argv[2], 10);

if (!userId || Number.isNaN(userId) || userId < 1) {
    console.error(`${colors.red}❌ Usage: node src/scripts/seedData.js <user_id>${colors.reset}`);
    process.exit(1);
}

console.log(`\n${colors.cyan}🌱 Health Tracker Data Seeder${colors.reset}`);
console.log(`${colors.cyan}================================${colors.reset}\n`);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
});

function showProgress(current, total, label = "Generating") {
    const percentage = Math.round((current / total) * 100);
    const barLength = 40;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    process.stdout.write(`\r${label}: [${bar}] ${percentage}%`);
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomNormal(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatDateForMySQL(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeForMySQL(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getSeedDate(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() - (90 - daysOffset));
    return date;
}

function getDateISO(daysOffset) {
    const date = getSeedDate(daysOffset);
    date.setHours(0, 0, 0, 0);
    return formatDateForMySQL(date);
}

function getTimestamp(daysOffset, hour, minute = 0) {
    const date = getSeedDate(daysOffset);
    date.setHours(Math.floor(hour), Math.floor(minute), 0, 0);
    return formatDateTimeForMySQL(date);
}

function generateActivities(userId) {
    const activities = [];
    const types = ["running", "walking", "cycling", "gym"];
    const typeWeights = [0.4, 0.3, 0.2, 0.1];

    for (let day = 0; day < 90; day++) {
        const hasActivity = Math.random() > 0.3;

        if (!hasActivity) continue;

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
        const progressionFactor = 1 + (day / 90) * 0.05;

        let duration;
        let distance;
        let calories;

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
            duration = Math.round(random(45, 120) * progressionFactor);
            distance = null;
            calories = Math.round(random(300, 600) * progressionFactor);
        }

        activities.push({
            user_id: userId,
            activity_type: type,
            distance_km: distance,
            duration_minutes: duration,
            calories_burned: calories,
            steps: Math.round(duration * 100 + random(200, 500)),
            avg_heart_rate: Math.round(random(110, 160)),
            max_heart_rate: Math.round(random(160, 190)),
            timestamp: getTimestamp(day, random(6, 20)),
            notes: `${type} activity - Day ${day + 1}`,
        });
    }

    return activities;
}

function generateSleepRecords(userId) {
    const sleepRecords = [];

    for (let day = 0; day < 90; day++) {
        const totalHoursRaw = randomNormal(7, 1);
        const totalHours = parseFloat(Math.max(5.5, Math.min(8.5, totalHoursRaw)).toFixed(2));

        let deepPercent = randomNormal(0.2, 0.05);
        let remPercent = randomNormal(0.25, 0.05);

        deepPercent = Math.max(0.1, Math.min(0.3, deepPercent));
        remPercent = Math.max(0.15, Math.min(0.35, remPercent));

        let deepHours = parseFloat((totalHours * deepPercent).toFixed(2));
        let remHours = parseFloat((totalHours * remPercent).toFixed(2));
        let lightHours = parseFloat((totalHours - deepHours - remHours).toFixed(2));

        if (lightHours < 0) {
            deepHours = parseFloat((totalHours * 0.2).toFixed(2));
            remHours = parseFloat((totalHours * 0.25).toFixed(2));
            lightHours = parseFloat((totalHours - deepHours - remHours).toFixed(2));
        }

        let qualityScore = Math.round((totalHours / 8) * 100);
        qualityScore = Math.max(30, Math.min(100, qualityScore + Math.round(random(-8, 8))));

        sleepRecords.push({
            user_id: userId,
            sleep_date: getDateISO(day),
            total_hours: totalHours,
            deep_sleep_hours: deepHours,
            light_sleep_hours: lightHours,
            rem_sleep_hours: remHours,
            awakenings: Math.round(random(0, 4)),
            quality_score: qualityScore,
            notes: `Sleep record - Day ${day + 1}`,
        });
    }

    return sleepRecords;
}

function mapHeartRateContext(context) {
    const mapping = {
        rest: "resting",
        exercise: "exercising",
        recovery: "other",
        anomaly: "other",
    };

    return mapping[context] || "other";
}

function generateHeartRateMeasurements(userId, activities) {
    const measurements = [];

    for (let day = 0; day < 90; day++) {
        measurements.push({
            user_id: userId,
            bpm: Math.round(random(60, 80)),
            context: "resting",
            timestamp: getTimestamp(day, 7, 0),
        });

        measurements.push({
            user_id: userId,
            bpm: Math.round(random(60, 80)),
            context: "resting",
            timestamp: getTimestamp(day, 20, 0),
        });

        const currentDate = getDateISO(day);

        const dayActivities = activities.filter((activity) => {
            return activity.timestamp.split(" ")[0] === currentDate;
        });

        for (const activity of dayActivities) {
            const measurementsCount = Math.round(random(5, 10));
            const startHour = Number(activity.timestamp.split(" ")[1].split(":")[0]) || 12;

            for (let i = 0; i < measurementsCount; i++) {
                const minute = Math.min(59, Math.round((i / measurementsCount) * 60));

                measurements.push({
                    user_id: userId,
                    bpm: Math.round(random(130, 170)),
                    context: mapHeartRateContext("exercise"),
                    timestamp: getTimestamp(day, startHour, minute),
                });
            }

            const recoveryDate = new Date(activity.timestamp.replace(" ", "T"));
            recoveryDate.setMinutes(recoveryDate.getMinutes() + 10);

            measurements.push({
                user_id: userId,
                bpm: Math.round(random(100, 130)),
                context: mapHeartRateContext("recovery"),
                timestamp: formatDateTimeForMySQL(recoveryDate),
            });
        }

        if (Math.random() < 0.05) {
            const anomalyBpm = Math.random() > 0.5
                ? Math.round(random(40, 59))
                : Math.round(random(180, 220));

            measurements.push({
                user_id: userId,
                bpm: anomalyBpm,
                context: "other",
                timestamp: getTimestamp(day, Math.round(random(8, 22)), Math.round(random(0, 59))),
            });
        }
    }

    return measurements;
}

async function insertDataBatch(connection, table, data) {
    const batchSize = 10;
    let inserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        await connection.beginTransaction();

        try {
            for (const record of batch) {
                const columns = Object.keys(record);
                const values = columns.map((col) => record[col]);
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

async function seedData() {
    const connection = await pool.getConnection();

    try {
        console.log(`${colors.yellow}📝 Generating data for user ID: ${userId}${colors.reset}\n`);

        const [user] = await connection.query(
            "SELECT user_id FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user.length) {
            throw new Error(`User with ID ${userId} not found`);
        }

        console.log(`${colors.cyan}1️⃣  Generating activities...${colors.reset}`);
        const activities = generateActivities(userId);
        console.log(`${colors.green}✓ Generated ${activities.length} activities${colors.reset}`);

        console.log(`${colors.cyan}2️⃣  Generating sleep records...${colors.reset}`);
        const sleepRecords = generateSleepRecords(userId);
        console.log(`${colors.green}✓ Generated ${sleepRecords.length} sleep records${colors.reset}`);

        console.log(`${colors.cyan}3️⃣  Generating heart rate measurements...${colors.reset}`);
        const heartRateMeasurements = generateHeartRateMeasurements(userId, activities);
        console.log(`${colors.green}✓ Generated ${heartRateMeasurements.length} heart rate measurements${colors.reset}`);

        console.log(`\n${colors.bright}${colors.cyan}📊 Cleaning old data...${colors.reset}`);
        await connection.query("DELETE FROM heart_rate WHERE user_id = ?", [userId]);
        await connection.query("DELETE FROM sleep_records WHERE user_id = ?", [userId]);
        await connection.query("DELETE FROM activities WHERE user_id = ?", [userId]);
        console.log(`${colors.green}✓ Old data cleaned${colors.reset}`);

        console.log(`\n${colors.bright}${colors.cyan}📊 Inserting data into database...${colors.reset}\n`);

        console.log("Inserting activities...");
        showProgress(0, activities.length);
        const activitiesInserted = await insertDataBatch(connection, "activities", activities);
        console.log(`\n${colors.green}✓ Inserted ${activitiesInserted} activities${colors.reset}`);

        console.log("\nInserting sleep records...");
        showProgress(0, sleepRecords.length);
        const sleepInserted = await insertDataBatch(connection, "sleep_records", sleepRecords);
        console.log(`\n${colors.green}✓ Inserted ${sleepInserted} sleep records${colors.reset}`);

        console.log("\nInserting heart rate measurements...");
        const totalHR = heartRateMeasurements.length;
        let hrInserted = 0;

        for (let i = 0; i < totalHR; i += 10) {
            const batch = heartRateMeasurements.slice(i, i + 10);
            hrInserted += await insertDataBatch(connection, "heart_rate", batch);
            showProgress(hrInserted, totalHR);
        }

        console.log(`\n${colors.green}✓ Inserted ${hrInserted} heart rate measurements${colors.reset}`);

        console.log(`\n${colors.bright}${colors.green}✅ Seed completed successfully!${colors.reset}`);
        console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
        console.log(`   • Activities: ${activitiesInserted}`);
        console.log(`   • Sleep records: ${sleepInserted}`);
        console.log(`   • Heart rate measurements: ${hrInserted}`);
        console.log(`   • Total records: ${activitiesInserted + sleepInserted + hrInserted}`);
        console.log("");
    } catch (error) {
        console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
    }
}

seedData();