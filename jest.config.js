/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
    coverageProvider : "v8",
    roots : [
        "<rootDir>/src/ts",
    ],
    testMatch : [
        "**/__tests__/**/*.+(ts|tsx|js)",
        "**/?(*.)+(spec|test).+(ts|tsx|js)",
    ],
    transform : {
        "^.+\\.(ts|tsx)$" : "ts-jest",
    },
};
