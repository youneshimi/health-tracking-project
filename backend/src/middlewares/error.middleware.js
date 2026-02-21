const ApiError = require("../utils/ApiError");

module.exports = (err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // éviter de leak en prod (simple)
    const payload = {
        error: {
            message,
            ...(err.details ? { details: err.details } : {}),
        },
    };

    // fallback si erreur non gérée
    if (!(err instanceof ApiError) && status === 500) {
        // vous pouvez logger err ici
    }

    res.status(status).json(payload);
};