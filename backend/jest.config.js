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
            branches: 50,
            functions: 60,
            lines: 56,
            statements: 55,
        },
    },
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    testTimeout: 10000,
    verbose: true,
    transform: {
        "^.+\\.js$": "babel-jest",
    },
};