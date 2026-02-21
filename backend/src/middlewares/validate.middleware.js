const ApiError = require("../utils/ApiError");

module.exports = (schemaFn) => (req, res, next) => {
    const errors = schemaFn(req);
    if (errors.length) return next(new ApiError(400, "Validation error", errors));
    next();
};