const router = require("express").Router();

router.get("/", (req, res) => {
    res.json({ message: "Health routes ready" });
});

module.exports = router;