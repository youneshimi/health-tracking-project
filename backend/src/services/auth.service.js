const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const { findUserByEmail, findUserById, createUser } = require("./user.service");
const { signAccessToken } = require("./token.service");

async function signup({ username, email, password, firstName, lastName }) {
    // validations minimales (en plus de validate.middleware si vous l’avez)
    if (!username || !email || !password) {
        throw new ApiError(400, "Missing required fields: username, email, password");
    }

    const exists = await findUserByEmail(email);
    if (exists) throw new ApiError(409, "Email already in use");

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
        username,
        email,
        passwordHash,
        firstName,
        lastName,
    });

    const token = signAccessToken({ userId: user.user_id, email: user.email });

    // on ne renvoie jamais password_hash
    return {
        user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
        },
        token,
    };
}

async function login({ email, password }) {
    if (!email || !password) throw new ApiError(400, "Missing email or password");

    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(401, "Invalid credentials");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new ApiError(401, "Invalid credentials");

    const token = signAccessToken({ userId: user.user_id, email: user.email });

    return {
        user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
        },
        token,
    };
}

async function me(decodedUser) {
    // decodedUser = { userId, email } depuis le token
    if (!decodedUser?.userId) throw new ApiError(401, "Invalid token payload");

    const user = await findUserById(decodedUser.userId);
    if (!user) throw new ApiError(404, "User not found");

    return {
        user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            createdAt: user.created_at,
        },
    };
}

module.exports = { signup, login, me };