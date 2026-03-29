"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setup;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
async function setup() {
    // load test env
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env.test') });
    const cwd = path_1.default.resolve(__dirname, '..');
    // generate prisma client for test schema
    (0, child_process_1.execSync)('npx prisma generate --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd });
    // ensure test DB is removed so migrations can be applied cleanly
    const candidates = [path_1.default.resolve(cwd, 'test.db'), path_1.default.resolve(cwd, 'prisma', 'test.db')];
    for (const p of candidates) {
        try {
            if (fs_1.default.existsSync(p)) {
                console.log('Removing existing test DB:', p);
                fs_1.default.unlinkSync(p);
            }
            // also remove WAL/SHM if present
            if (fs_1.default.existsSync(p + '-wal'))
                fs_1.default.unlinkSync(p + '-wal');
            if (fs_1.default.existsSync(p + '-shm'))
                fs_1.default.unlinkSync(p + '-shm');
        }
        catch (e) {
            console.warn('Could not remove test DB file', p, e);
        }
    }
    // sync schema to test database (no migration history required)
    (0, child_process_1.execSync)('npx prisma db push --schema=prisma/schema.test.prisma --force-reset', { stdio: 'inherit', cwd });
    // run minimal test seed
    (0, child_process_1.execSync)('node prisma/seed.test.js', { stdio: 'inherit', cwd });
}
