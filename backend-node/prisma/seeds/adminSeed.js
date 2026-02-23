"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = "titasembi@gmail.com";
    const password = "Far@el11";
    const existingAdmin = await prisma.user.findUnique({
        where: { email },
    });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    if (existingAdmin) {
        await prisma.user.update({
            where: { email },
            data: {
                password_hash: passwordHash,
                role: "ADMIN",
                is_admin: true,
            },
        });
        console.log("Admin updated successfully");
        return;
    }
    await prisma.user.create({
        data: {
            name: "Admin",
            email,
            password_hash: passwordHash,
            role: "ADMIN",
            is_admin: true,
            referral_code: "ADMIN001",
        },
    });
    console.log("Admin created successfully");
}
main()
    .catch((e) => {
    console.error(e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
