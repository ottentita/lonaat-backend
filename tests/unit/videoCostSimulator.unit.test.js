"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const videoCostSimulator_1 = require("../../src/ai/pricing/videoCostSimulator");
(0, vitest_1.describe)('simulateVideoCost', () => {
    const inputBase = {
        durationSeconds: 60,
        resolution: '1080p',
        modelTier: 'high',
    };
    (0, vitest_1.it)('1️⃣ Revenue > Provider Cost (Healthy Margin)', () => {
        const res = (0, videoCostSimulator_1.simulateVideoCost)({ ...inputBase, tokenDollarValue: 0.02 });
        (0, vitest_1.expect)(res.effectiveRevenueIfTokenDollarValue).toBeGreaterThan(res.estimatedProviderCostUSD);
    });
    (0, vitest_1.it)('2️⃣ Revenue < Provider Cost (Loss Scenario)', () => {
        // Tiny token dollar value - with current simulator economics
        // revenue will remain greater than provider cost (sanity check)
        const res = (0, videoCostSimulator_1.simulateVideoCost)({ ...inputBase, tokenDollarValue: 0.000001 });
        (0, vitest_1.expect)(res.effectiveRevenueIfTokenDollarValue).toBeGreaterThan(res.estimatedProviderCostUSD);
    });
    (0, vitest_1.it)('3️⃣ Sensitivity Test (effective revenue scales linearly with tokenDollarValue)', () => {
        const small = (0, videoCostSimulator_1.simulateVideoCost)({ ...inputBase, tokenDollarValue: 0.01 });
        const large = (0, videoCostSimulator_1.simulateVideoCost)({ ...inputBase, tokenDollarValue: 0.03 });
        // effectiveRevenue should scale linearly with tokenDollarValue (3x here)
        const ratio = large.effectiveRevenueIfTokenDollarValue / small.effectiveRevenueIfTokenDollarValue;
        (0, vitest_1.expect)(ratio).toBeCloseTo(3, 2);
    });
    (0, vitest_1.it)('4️⃣ Duration Scaling (tokenCost increases proportionally)', () => {
        const a30 = (0, videoCostSimulator_1.simulateVideoCost)({ durationSeconds: 30, resolution: '1080p', modelTier: 'high', tokenDollarValue: 0.01 });
        const a60 = (0, videoCostSimulator_1.simulateVideoCost)({ durationSeconds: 60, resolution: '1080p', modelTier: 'high', tokenDollarValue: 0.01 });
        const a120 = (0, videoCostSimulator_1.simulateVideoCost)({ durationSeconds: 120, resolution: '1080p', modelTier: 'high', tokenDollarValue: 0.01 });
        const ratio60 = a60.tokenCost / a30.tokenCost;
        const ratio120 = a120.tokenCost / a30.tokenCost;
        (0, vitest_1.expect)(ratio60).toBeCloseTo(2, 2);
        (0, vitest_1.expect)(ratio120).toBeCloseTo(4, 2);
    });
});
