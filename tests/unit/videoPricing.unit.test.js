"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const videoPricing_1 = require("../../src/ai/pricing/videoPricing");
(0, vitest_1.describe)('calculateVideoTokenCost', () => {
    (0, vitest_1.it)('10s 720p standard => 10 tokens', () => {
        const tokens = (0, videoPricing_1.calculateVideoTokenCost)({ durationSeconds: 10, resolution: '720p', modelTier: 'standard' });
        (0, vitest_1.expect)(tokens).toBe(10);
    });
    (0, vitest_1.it)('20s 1080p high => 42 tokens', () => {
        const tokens = (0, videoPricing_1.calculateVideoTokenCost)({ durationSeconds: 20, resolution: '1080p', modelTier: 'high' });
        // (20) * 1.5 * 1.4 = 42
        (0, vitest_1.expect)(tokens).toBe(42);
    });
    (0, vitest_1.it)('120s 4K high => large cost', () => {
        const tokens = (0, videoPricing_1.calculateVideoTokenCost)({ durationSeconds: 120, resolution: '4k', modelTier: 'high' });
        // 120 * 2.5 * 1.4 = 420 => ceil 420
        (0, vitest_1.expect)(tokens).toBe(420);
    });
    (0, vitest_1.it)('duration > max throws', () => {
        (0, vitest_1.expect)(() => (0, videoPricing_1.calculateVideoTokenCost)({ durationSeconds: 121, resolution: '720p', modelTier: 'standard' })).toThrow();
    });
});
