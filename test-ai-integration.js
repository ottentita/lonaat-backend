"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const jwt = __importStar(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
async function testAIIntegration() {
    // programmatically start server for testing
    const { default: app } = await Promise.resolve().then(() => __importStar(require('./src/index')));
    const server = app.listen(4000);
    try {
        console.log('🚀 Starting AI Integration Test\n');
        // Create or find test user
        console.log('1️⃣ Setting up test user...');
        let user = await prisma.user.findUnique({
            where: { email: 'aitest@example.com' }
        });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: 'aitest@example.com',
                    password: 'test_hash_123', // Not used in test, just for schema requirement
                    plan: 'free',
                    tokens: 10 // Free tier starts with 10 tokens
                }
            });
            console.log(`✅ Created test user: ${user.email} with ${user.tokens} tokens\n`);
        }
        else {
            // Reset tokens for fresh test
            await prisma.user.update({
                where: { id: user.id },
                data: { tokens: 10 }
            });
            console.log(`✅ Using existing user: ${user.email}, reset to 10 tokens\n`);
        }
        // Generate JWT token
        console.log('2️⃣ Generating JWT token...');
        const token = jwt.sign({ userId: user.id, id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        console.log(`✅ Token generated (first 50 chars): ${token.substring(0, 50)}...\n`);
        // Create test offer if it doesn't exist
        console.log('3️⃣ Setting up test offer...');
        let offer = await prisma.offer.findFirst();
        if (!offer) {
            offer = await prisma.offer.create({
                data: {
                    name: 'Test Product',
                    title: 'Test Product',
                    slug: `test-product-${Date.now()}`,
                    description: 'A test product for AI content generation',
                    url: 'https://example.com/test',
                    sellerId: user.id
                }
            });
            console.log(`✅ Created test offer: ${offer.name}\n`);
        }
        else {
            console.log(`✅ Using existing offer: ${offer.name}\n`);
        }
        // Test AI Content Generation Endpoint
        console.log('4️⃣ Testing POST /api/ai/generate-content...');
        try {
            const aiResponse = await axios_1.default.post('http://localhost:4000/api/ai/generate-content', {
                offerId: offer.id,
                productName: 'AI Resume Builder',
                description: 'Creates professional resumes instantly',
                audience: 'Students and job seekers'
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ AI Content Generated Successfully!');
            console.log(`📊 Response:`);
            console.log(`   - Success: ${aiResponse.data.success}`);
            console.log(`   - DraftID: ${aiResponse.data.draftId}`);
            console.log(`   - Remaining Tokens: ${aiResponse.data.remainingTokens}`);
            console.log(`   - Generated Content Keys: ${Object.keys(aiResponse.data.content).join(', ')}\n`);
            if (aiResponse.data.content.hooks) {
                console.log(`   - Hooks (array): ${aiResponse.data.content.hooks.length} items`);
                console.log(`     First hook: "${aiResponse.data.content.hooks[0]}"`);
            }
            if (aiResponse.data.content.script) {
                console.log(`   - Script: ${aiResponse.data.content.script.substring(0, 60)}...`);
            }
            if (aiResponse.data.content.caption) {
                console.log(`   - Caption: ${aiResponse.data.content.caption.substring(0, 60)}...`);
            }
            if (aiResponse.data.content.hashtags) {
                console.log(`   - Hashtags: ${Array.isArray(aiResponse.data.content.hashtags) ? aiResponse.data.content.hashtags.join(' ') : aiResponse.data.content.hashtags}`);
            }
        }
        catch (error) {
            console.error('❌ AI Content Generation Failed!');
            console.error(`   Status: ${error.response?.status}`);
            console.error(`   Error: ${error.response?.data?.error || error.message}`);
            if (error.response?.data) {
                console.error(`   Response: ${JSON.stringify(error.response.data)}`);
            }
        }
        // Verify token was deducted
        console.log('\n5️⃣ Verifying token deduction...');
        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id }
        });
        console.log(`✅ User tokens before: 10, after: ${updatedUser?.tokens}`);
        console.log(`   Token deducted: ${10 - (updatedUser?.tokens || 0) === 1 ? '✅ Yes (1 token)' : '❌ No'}\n`);
        // Check if draft was created
        console.log('6️⃣ Checking if ContentDraft was created...');
        const draft = await prisma.contentDraft.findFirst({
            where: { userId: user.id }
        });
        if (draft) {
            console.log(`✅ ContentDraft created: ID ${draft.id}, Status: ${draft.status}`);
            console.log(`   Hooks stored as: ${typeof draft.hooks}`);
        }
        else {
            console.log('❌ No ContentDraft found');
        }
        // Check if AiUsage was logged
        console.log('\n7️⃣ Checking if AI usage was logged...');
        const usage = await prisma.aiUsage.findFirst({
            where: { userId: user.id }
        });
        if (usage) {
            console.log(`✅ AiUsage logged: ID ${usage.id}, Tokens: ${usage.tokensUsed}`);
        }
        else {
            console.log('❌ No AiUsage record found');
        }
        // Test insufficient tokens response
        console.log('\n8️⃣ Testing insufficient tokens (402) response...');
        try {
            // First, drain all tokens
            await prisma.user.update({
                where: { id: user.id },
                data: { tokens: 0 }
            });
            console.log('   Token balance set to 0');
            const response = await axios_1.default.post('http://localhost:4000/api/ai/generate-content', {
                offerId: offer.id,
                productName: 'Test',
                description: 'Test',
                audience: 'Test'
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Expected 402 but got success');
        }
        catch (error) {
            if (error.response?.status === 402) {
                console.log(`✅ Correctly returned 402 with message: "${error.response?.data?.error}"`);
            }
            else {
                console.log(`❌ Expected 402, got ${error.response?.status}`);
            }
        }
        // Test GET /my-content endpoint
        console.log('\n9️⃣ Testing GET /api/ai/my-content...');
        try {
            const contentResponse = await axios_1.default.get('http://localhost:4000/api/ai/my-content', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log(`✅ Retrieved drafts: Count = ${contentResponse.data.count}`);
        }
        catch (error) {
            console.error(`❌ Failed to retrieve content: ${error.response?.data?.error}`);
        }
        console.log('\n✨ AI Integration Test Complete!');
    }
    catch (error) {
        console.error('Fatal error:', error);
    }
    finally {
        await prisma.$disconnect();
        server.close();
    }
}
// Run the test
testAIIntegration();
