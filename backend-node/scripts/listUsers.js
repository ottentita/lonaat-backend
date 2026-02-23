"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../src/prisma"));
async function main() {
    const users = await prisma_1.default.user.findMany({ take: 5 });
    console.log('USERS:', users.map(u => ({ id: u.id, email: u.email })));
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
