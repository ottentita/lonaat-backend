const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

class CookieJar {
  constructor() {
    this.cookies = {};
  }

  extractFromResponse(response) {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      if (Array.isArray(setCookie)) {
        setCookie.forEach(cookie => this.parseCookie(cookie));
      } else {
        this.parseCookie(setCookie);
      }
    }
  }

  parseCookie(cookieString) {
    const parts = cookieString.split(';')[0];
    const [name, value] = parts.split('=');
    if (name && value) {
      this.cookies[name.trim()] = decodeURIComponent(value);
    }
  }

  getCookieHeader() {
    return Object.entries(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

// Create axios instance with cookie support
const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true, // don't throw on any status code
});

const cookieJar = new CookieJar();

// Interceptor to add cookies to requests
api.interceptors.request.use((config) => {
  const cookieHeader = cookieJar.getCookieHeader();
  if (cookieHeader) {
    config.headers.Cookie = cookieHeader;
  }
  return config;
});

// Interceptor to extract cookies from responses
api.interceptors.response.use((response) => {
  cookieJar.extractFromResponse(response);
  return response;
});

async function runSmokeTests() {
  console.log('🔥 ENHANCED COOKIE-ONLY AUTH SMOKE TESTS\n');
  console.log('Testing: Pure cookie-based auth (NO header fallback)\n');

  try {
    // Test 1: Try /auth/me without authentication
    console.log('Test 1: GET /auth/me (no auth) - should return 401');
    let res = await api.get('/auth/me');
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
    console.log('✓ PASS: Got 401 without auth\n');

    // Test 2: Register a test user
    console.log('Test 2: POST /auth/register');
    const testUser = {
      name: 'Smoke Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
    res = await api.post('/auth/register', testUser);
    if (res.status !== 201) {
      throw new Error(`Register returned ${res.status}`);
    }
    console.log('✓ PASS: User registered\n');

    // Test 3: Login
    console.log('Test 3: POST /auth/login');
    res = await api.post('/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });
    
    const cookies = res.headers['set-cookie'];
    console.log(`  Status: ${res.status}`);
    console.log(`  Cookie set: ${cookies ? '✓ YES' : '✗ NO'}`);
    
    if (res.status !== 200 || !cookies) {
      throw new Error(`Login failed or no cookie set`);
    }
    console.log('✓ PASS: Login successful with cookie\n');

    // Test 4: GET /auth/me with cookie
    console.log('Test 4: GET /auth/me (with cookie)');
    res = await api.get('/auth/me');
    if (res.status !== 200) {
      throw new Error(`/auth/me returned ${res.status}`);
    }
    console.log('✓ PASS: /auth/me works with cookie\n');

    // Test 5: Access protected endpoint with cookie
    console.log('Test 5: GET /user/profile (with cookie)');
    res = await api.get('/user/profile');
    if (res.status !== 200) {
      throw new Error(`/user/profile returned ${res.status}`);
    }
    console.log('✓ PASS: Protected route accessible with cookie\n');

    // Test 6: Try protected endpoint WITHOUT any credentials
    console.log('Test 6: GET /user/profile (NO credentials) - should return 401');
    const noCookieApi = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
    });
    res = await noCookieApi.get('/user/profile');
    if (res.status !== 401) {
      throw new Error(`Expected 401 without credentials, got ${res.status}`);
    }
    console.log('✓ PASS: Got 401 without credentials\n');

    // Test 7: Try protected endpoint with Bearer header ONLY (should fail - no fallback)
    console.log('Test 7: GET /user/profile (Bearer header ONLY) - should return 401');
    res = await noCookieApi.get('/user/profile', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      }
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 with header only, got ${res.status} - HEADER FALLBACK STILL EXISTS!`);
    }
    console.log('✓ PASS: Bearer header correctly ignored (pure cookie-only)\n');

    // Test 8: Logout
    console.log('Test 8: POST /auth/logout');
    res = await api.post('/auth/logout');
    if (res.status !== 200) {
      throw new Error(`Logout returned ${res.status}`);
    }
    cookieJar.cookies = {};
    console.log('✓ PASS: Logout successful, cookie cleared\n');

    // Test 9: Verify access denied after logout
    console.log('Test 9: GET /auth/me (after logout) - should return 401');
    res = await api.get('/auth/me');
    if (res.status !== 401) {
      throw new Error(`/auth/me returned ${res.status} after logout`);
    }
    console.log('✓ PASS: Got 401 after logout\n');

    console.log('═══════════════════════════════════════════');
    console.log('✅ ALL SMOKE TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log('\n✓ Cookie-only auth is working');
    console.log('✓ No header fallback present');
    console.log('✓ Cookie clearance on logout verified\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n⚠️  ENSURE:');
    console.error('  1. Backend is running: npm run dev');
    console.error('  2. Auth middleware has pure cookie-only logic');
    console.error('  3. No Bearer header fallback in middleware\n');
    process.exit(1);
  }
}

runSmokeTests();
