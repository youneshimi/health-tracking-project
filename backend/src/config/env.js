// src/config/env.js
require("dotenv").config();

const required = ["PORT", "DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
for (const k of required) {
    if (!process.env[k]) throw new Error(`Missing env var: ${k}`);
}

module.exports = {
    PORT: Number(process.env.PORT || 4000),
    DB_HOST: process.env.DB_HOST,
    DB_PORT: Number(process.env.DB_PORT || 3306),
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD || "",
    DB_NAME: process.env.DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};