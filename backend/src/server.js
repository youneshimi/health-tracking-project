const { PORT } = require("./config/env");
const app = require("./app");

app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on port ${PORT}`);
});