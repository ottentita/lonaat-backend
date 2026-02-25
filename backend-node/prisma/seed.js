"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Running Prisma deterministic seed...');
    // 1) Users: 1 admin + 4 affiliates
    const usersSpec = [
        { name: 'Admin User', email: 'admin@lonaat.com', password: 'Admin123!', role: 'ADMIN', is_admin: true, balance: '0' },
        { name: 'Affiliate A', email: 'aff1@lonaat.com', password: 'AffPass1!', role: 'USER', is_admin: false, balance: '100' },
        { name: 'Affiliate B', email: 'aff2@lonaat.com', password: 'AffPass2!', role: 'USER', is_admin: false, balance: '200' },
        { name: 'Affiliate C', email: 'aff3@lonaat.com', password: 'AffPass3!', role: 'USER', is_admin: false, balance: '300' },
        { name: 'Affiliate D', email: 'aff4@lonaat.com', password: 'AffPass4!', role: 'USER', is_admin: false, balance: '400' },
    ];
    const createdUsers = [];
    for (const [i, u] of usersSpec.entries()) {
        const passwordHash = await bcryptjs_1.default.hash(u.password, 10);
        const referral_code = `SEED${i + 1}`;
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            createdUsers.push(existing);
            console.log(`⚠️  User ${u.email} exists - reusing`);
            continue;
        }
        const user = await prisma.user.create({
            data: {
                name: u.name,
                email: u.email,
                password: passwordHash,
                role: u.role,
                balance: u.balance,
                isActive: true,
            },
        });
        createdUsers.push(user);
        console.log(`✅ Created user ${u.email}`);
    }
    // Map affiliates (exclude admin)
    const affiliates = createdUsers.filter((x) => x.role !== 'ADMIN');
    if (affiliates.length < 4) {
        console.warn('⚠️  Less than 4 affiliates created — stopping further seed steps.');
    }
    // 2) Offers: 10 offers
    const offers = [];
    for (let i = 1; i <= 10; i++) {
        const externalOfferId = `seed_offer_${i}`;
        const seller = affiliates[(i - 1) % Math.max(affiliates.length, 1)];
        const existing = await prisma.offer.findUnique({ where: { externalOfferId } });
        if (existing) {
            offers.push(existing);
            continue;
        }
        const offer = await prisma.offer.create({
            data: {
                title: `Offer ${i}`,
                description: `Deterministic seeded offer ${i}`,
                url: `https://offers.example.com/${i}`,
                network: 'seed-net',
                externalOfferId,
                isActive: true,
                payout: `${5 + i}`,
                sellerId: seller ? seller.id : undefined,
            },
        });
        offers.push(offer);
    }
    // 3) Clicks: 50 clicks across offers
    const totalClicks = 50;
    const clicks = [];
    for (let i = 0; i < totalClicks; i++) {
        const offer = offers[i % offers.length];
        const user = i % 5 !== 0 ? affiliates[i % affiliates.length] : null; // some anonymous
        const clickId = `seed_click_${i + 1}`;
        const clickToken = `seed_token_${i + 1}`;
        const existing = await prisma.click.findUnique({ where: { clickId } });
        if (existing) {
            clicks.push(existing);
            continue;
        }
        const timeBucket = Math.floor(Date.now() / 5000)
        const click = await prisma.click.create({
            data: {
                offerId: offer.id,
                adId: offer.id,
                userId: user ? user.id : 0,
                timeBucket,
                clickId,
                clickToken,
                ip: `192.0.2.${(i % 250) + 1}`,
                userAgent: 'SeedAgent/1.0',
                user_id: user ? user.id : undefined,
            },
        });
        clicks.push(click);
    }
    // 4) Conversions: 12 conversions
    const conversions = [];
    for (let i = 0; i < 12; i++) {
        const offer = offers[i % offers.length];
        const click = clicks[i % clicks.length];
        const amount = (10 + i).toFixed(2);
        const existing = await prisma.conversion.findFirst({ where: { offerId: offer.id, amount: amount } });
        if (existing) {
            conversions.push(existing);
            continue;
        }
        const conv = await prisma.conversion.create({
            data: {
                offerId: offer.id,
                clickId: click.clickId,
                amount: amount,
                status: i < 8 ? 'completed' : 'pending',
            },
        });
        conversions.push(conv);
    }
    // 5) Commissions: 12 commissions, make 8 approved/paid-like
    const commissions = [];
    for (let i = 0; i < 12; i++) {
        const offer = offers[i % offers.length];
        const owner = offer.sellerId ? await prisma.user.findUnique({ where: { id: offer.sellerId } }) : affiliates[0];
        const click = clicks[i % clicks.length];
        const amount = (5 + i).toFixed(2);
        const external_ref = `seed_comm_${i + 1}`;
        const existing = await prisma.commission.findFirst({ where: { external_ref } });
        if (existing) {
            commissions.push(existing);
            continue;
        }
        const status = i < 8 ? 'paid' : 'pending';
        const c = await prisma.commission.create({
            data: {
                user_id: owner.id,
                click_id: click.id,
                network: 'seed-net',
                product_id: offer.id,
                amount: amount,
                status,
                external_ref,
            },
        });
        commissions.push(c);
    }
    // 6) Payouts: 3 completed payments (as payouts)
    const payoutAmounts = ['50.00', '75.25', '100.00'];
    for (let i = 0; i < payoutAmounts.length; i++) {
        const user = affiliates[i % affiliates.length];
        const transactionId = `seed_payout_${i + 1}`;
        const existing = await prisma.payment.findUnique({ where: { transactionId } });
        if (existing) {
            console.log(`⚠️  Payout ${transactionId} exists - skipping`);
            continue;
        }
        await prisma.payment.create({
            data: {
                userId: user.id,
                amount: payoutAmounts[i],
                currency: 'USD',
                status: 'completed',
                provider: 'payout',
                transactionId,
            },
        });
    }
    // Summary
    const counts = await Promise.all([
        prisma.user.count(),
        prisma.offer.count(),
        prisma.click.count(),
        prisma.conversion.count(),
        prisma.commission.count(),
        prisma.payment.count(),
    ]);
    console.log('\n✅ Prisma seed complete');
    console.log(`- Users: ${counts[0]}`);
    console.log(`- Offers: ${counts[1]}`);
    console.log(`- Clicks: ${counts[2]}`);
    console.log(`- Conversions: ${counts[3]}`);
    console.log(`- Commissions: ${counts[4]}`);
    console.log(`- Payments: ${counts[5]}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
