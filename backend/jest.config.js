module.exports = {
    testEnvironment: "node",
    testMatch: ["**/tests/**/*.test.js"],
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/server.js",
        "!src/scripts/**",
        "!src/config/**",
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    testTimeout: 10000,
    verbose: true,
};
