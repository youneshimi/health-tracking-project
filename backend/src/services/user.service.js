const pool = require("../config/db");

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `SELECT user_id, username, email, password_hash, first_name, last_name, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
        [email]
    );
    return rows[0] || null;
}

async function findUserById(userId) {
    const [rows] = await pool.query(
        `SELECT user_id, username, email, first_name, last_name, created_at
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

async function createUser({ username, email, passwordHash, firstName, lastName }) {
    const [result] = await pool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name)
     VALUES (?, ?, ?, ?, ?)`,
        [username, email, passwordHash, firstName || null, lastName || null]
    );

    return {
        user_id: result.insertId,
        username,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
    };
}

module.exports = { findUserByEmail, findUserById, createUser };