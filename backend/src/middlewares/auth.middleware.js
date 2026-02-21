const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../services/token.service");

module.exports = (req, res, next) => {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return next(new ApiError(401, "Missing or invalid Authorization header"));
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded; // ex: { userId, email }
        return next();
    } catch {
        return next(new ApiError(401, "Invalid or expired token"));
    }
};