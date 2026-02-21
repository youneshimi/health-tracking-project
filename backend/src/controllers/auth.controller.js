const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

exports.signup = asyncHandler(async (req, res) => {
    const { user, token } = await authService.signup(req.body);
    res.status(201).json({ user, token });
});

exports.login = asyncHandler(async (req, res) => {
    const { user, token } = await authService.login(req.body);
    res.status(200).json({ user, token });
});

exports.me = asyncHandler(async (req, res) => {
    const data = await authService.me(req.user);
    res.status(200).json(data);
});