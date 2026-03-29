"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: 'node',
        globals: false,
        setupFiles: ['./tests/vitest.setup.ts'],
        hookTimeout: 120000,
        // Use global setup/teardown to prepare and clean the test Postgres DB
        globalSetup: './tests/setupTestDb.ts',
        globalTeardown: './tests/teardownTestDb.ts',
        include: ['tests/**/*.test.ts'],
        // Force serial execution to avoid concurrency issues against the test DB
        threads: false,
        maxThreads: 1,
        minThreads: 1,
        isolate: true,
        sequence: {
            concurrent: false
        }
    }
});
