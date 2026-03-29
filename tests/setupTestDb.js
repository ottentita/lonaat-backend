"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setup;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
async function waitForPostgres(uri, maxAttempts = 30, intervalMs = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        try {
            const client = new pg_1.Client({ connectionString: uri });
            await client.connect();
            await client.end();
            console.log(`Postgres is available (after ${attempts} attempt${attempts === 1 ? '' : 's'})`);
            return true;
        }
        catch (e) {
            console.log(`Postgres not ready yet (attempt ${attempts}/${maxAttempts}) - retrying in ${intervalMs}ms`);
            await new Promise((r) => setTimeout(r, intervalMs));
        }
    }
    return false;
}
async function setup() {
    // load test env (.env.test)
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env.test') });
    const cwd = path_1.default.resolve(__dirname, '..');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl)
        throw new Error('DATABASE_URL is not set in .env.test');
    console.log('Waiting for Postgres at', dbUrl);
    const ok = await waitForPostgres(dbUrl, 30, 1000);
    if (!ok) {
        throw new Error('Postgres did not become ready within 30 seconds');
    }
    console.log('Running Prisma migrate deploy against', dbUrl);
    // Deploy migrations to the test Postgres DB (requires DB to be up)
    (0, child_process_1.execSync)('npx prisma migrate deploy --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd, env: { ...process.env } });
    // Run test seed if present
    try {
        (0, child_process_1.execSync)('node prisma/seed.test.js', { stdio: 'inherit', cwd, env: { ...process.env } });
    }
    catch (e) {
        console.warn('No test seed or seed failed:', e);
    }
}
