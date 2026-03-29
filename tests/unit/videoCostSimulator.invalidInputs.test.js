"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const videoCostSimulator_1 = require("../../src/ai/pricing/videoCostSimulator");
(0, vitest_1.describe)('videoCostSimulator invalid inputs', () => {
    (0, vitest_1.it)('rejects duration > 600 seconds', () => {
        (0, vitest_1.expect)(() => (0, videoCostSimulator_1.simulateVideoCost)({ durationSeconds: 601, resolution: '720p', modelTier: 'standard', tokenDollarValue: 0.01 })).toThrow('ERR_INVALID_VIDEO_INPUT');
    });
    (0, vitest_1.it)('rejects unsupported resolution', () => {
        (0, vitest_1.expect)(() => (0, videoCostSimulator_1.simulateVideoCost)({ durationSeconds: 60, resolution: '4k', modelTier: 'standard', tokenDollarValue: 0.01 })).toThrow('ERR_INVALID_VIDEO_INPUT');
    });
});
