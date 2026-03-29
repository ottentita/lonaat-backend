"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = teardown;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function teardown() {
    try {
        const dbPath = path_1.default.resolve(__dirname, '../test.db');
        if (fs_1.default.existsSync(dbPath))
            fs_1.default.unlinkSync(dbPath);
    }
    catch (e) {
        // ignore
        console.warn('teardown error', e);
    }
}
