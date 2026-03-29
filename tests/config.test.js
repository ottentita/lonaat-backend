"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// the module under test logs warnings for missing envs when loaded
(0, vitest_1.describe)('affiliateConfig environment validation', () => {
    (0, vitest_1.it)('warns when required variables are missing', () => {
        const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
        // delete environment vars to simulate missing
        delete process.env.DIGISTORE_API_KEY;
        delete process.env.DIGISTORE_WEBHOOK_SECRET;
        delete process.env.CLICKBANK_API_KEY;
        delete process.env.CLICKBANK_WEBHOOK_SECRET;
        delete process.env.JVZOO_WEBHOOK_SECRET;
        delete process.env.WARRIORPLUS_WEBHOOK_SECRET;
        const config = require('../src/config/affiliateConfig');
        (0, vitest_1.expect)(warnSpy).toHaveBeenCalled();
        // config object should still exist with undefined values
        (0, vitest_1.expect)(config).toHaveProperty('digistore');
        warnSpy.mockRestore();
    });
});
