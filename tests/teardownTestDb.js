"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = teardown;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
async function teardown() {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env.test') });
    const cwd = path_1.default.resolve(__dirname, '..');
    try {
        console.log('Resetting test database schema');
        // Reset database by running migrate reset non-interactively
        (0, child_process_1.execSync)('npx prisma migrate reset --force --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd, env: { ...process.env } });
    }
    catch (e) {
        console.warn('Failed to reset test DB:', e);
    }
}
