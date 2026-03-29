"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ExampleNetworkAdapter_1 = __importDefault(require("../../src/networks/ExampleNetworkAdapter"));
// mock node-fetch at module level with a customizable implementation
let mockData = null;
vitest_1.vi.mock('node-fetch', () => ({
    default: (url, opts) => Promise.resolve({ ok: true, json: async () => mockData })
}));
(0, vitest_1.describe)('ExampleNetworkAdapter', () => {
    (0, vitest_1.beforeAll)(() => {
        process.env.EXAMPLE_API_KEY = 'example_key';
        process.env.EXAMPLE_PLATFORM_AFF_ID = 'EXPLATFORM';
    });
    (0, vitest_1.it)('normalizes offers from external API', async () => {
        mockData = [{ id: 'a1', title: 'T1', tracking_url: 'https://a/track' }];
        const adapter = new ExampleNetworkAdapter_1.default('https://api.example');
        const offers = await adapter.fetchOffers({});
        (0, vitest_1.expect)(Array.isArray(offers)).toBe(true);
        (0, vitest_1.expect)(offers[0].externalId).toBe('a1');
    });
    (0, vitest_1.it)('builds redirect URL with platform aff and sub_id and click_token', () => {
        const adapter = new ExampleNetworkAdapter_1.default('https://api.example');
        const url = adapter.buildTrackingLink({ trackingUrl: 'https://redir.example/offer' }, 5, 'clk123');
        (0, vitest_1.expect)(url).toContain('aff_id=EXPLATFORM');
        (0, vitest_1.expect)(url).toContain('sub_id=5-clk123');
        (0, vitest_1.expect)(url).toContain('click_token=clk123');
    });
    (0, vitest_1.it)('parses postback params to internal mapping', () => {
        const adapter = new ExampleNetworkAdapter_1.default('https://api.example');
        const parsed = adapter.parsePostback({ query: { offer_id: 'a1', token: 'tok', revenue: '2.5' } });
        (0, vitest_1.expect)(parsed.externalOfferId).toBe('a1');
        (0, vitest_1.expect)(parsed.clickToken).toBe('tok');
        (0, vitest_1.expect)(parsed.revenue).toBe(2.5);
    });
});
