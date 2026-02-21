const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");
const requireAuth = require("../middlewares/auth.middleware");

const signupSchema = (req) => {
    const e = [];
    const { email, password, name } = req.body || {};
    if (!email || typeof email !== "string") e.push({ field: "email", msg: "email is required" });
    if (!password || typeof password !== "string" || password.length < 6)
        e.push({ field: "password", msg: "password min length is 6" });
    if (name && typeof name !== "string") e.push({ field: "name", msg: "name must be string" });
    return e;
};

const loginSchema = (req) => {
    const e = [];
    const { email, password } = req.body || {};
    if (!email || typeof email !== "string") e.push({ field: "email", msg: "email is required" });
    if (!password || typeof password !== "string") e.push({ field: "password", msg: "password is required" });
    return e;
};

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", requireAuth, authController.me);

module.exports = router;