/**
 * Detailed API Investigation Script
 * Investigates specific failures from the integration test
 */

const API_URL = 'http://localhost:3002';

async function apiRequest(method, endpoint, options = {}) {
  const { body, token } = options;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function investigate() {
  console.log('=== Investigating API Failures ===\n');

  // Get a leader token
  console.log('1. Login as leader...');
  const loginResponse = await apiRequest('POST', '/users/login', {
    body: { email: 'leader@test.com', password: 'password123' }
  });

  if (!loginResponse.ok) {
    console.log('Failed to login:', loginResponse.data);
    return;
  }

  const leaderToken = loginResponse.data.token;
  console.log('   ✓ Login successful\n');

  // Test 1: Signup schema validation
  console.log('2. Testing signup schema validation...');
  const signupTest = {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Test User'
  };
  const signupResponse = await apiRequest('POST', '/users/signup', { body: signupTest });
  console.log(`   Status: ${signupResponse.status}`);
  console.log(`   Response:`, JSON.stringify(signupResponse.data, null, 2));
  console.log();

  // Test 2: Get service types
  console.log('3. Getting service types...');
  const serviceTypesResponse = await apiRequest('GET', '/serviceTypes', { token: leaderToken });
  console.log(`   Status: ${serviceTypesResponse.status}`);
  console.log(`   Service Types:`, JSON.stringify(serviceTypesResponse.data, null, 2));
  console.log();

  // Test 3: Create service with proper schema
  if (Array.isArray(serviceTypesResponse.data) && serviceTypesResponse.data.length > 0) {
    const serviceTypeId = serviceTypesResponse.data[0].id;
    console.log('4. Testing service creation...');

    // Test with ISO datetime
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const serviceData = {
      date: futureDate.toISOString(),
      serviceTypeId: serviceTypeId,
      notes: 'Test service'
    };

    console.log(`   Sending data:`, JSON.stringify(serviceData, null, 2));
    const createServiceResponse = await apiRequest('POST', '/services', {
      token: leaderToken,
      body: serviceData
    });
    console.log(`   Status: ${createServiceResponse.status}`);
    console.log(`   Response:`, JSON.stringify(createServiceResponse.data, null, 2));
    console.log();
  }

  // Test 4: Check suggestions routes
  console.log('5. Testing suggestions routes...');
  const suggestionsListResponse = await apiRequest('GET', '/suggestions', { token: leaderToken });
  console.log(`   GET /suggestions - Status: ${suggestionsListResponse.status}`);
  console.log(`   Response:`, JSON.stringify(suggestionsListResponse.data, null, 2));
  console.log();

  console.log('6. Testing suggestion-slots routes...');
  const slotsListResponse = await apiRequest('GET', '/suggestion-slots', { token: leaderToken });
  console.log(`   GET /suggestion-slots - Status: ${slotsListResponse.status}`);
  console.log(`   Response:`, JSON.stringify(slotsListResponse.data, null, 2));
  console.log();

  // Test 5: Check CORS headers
  console.log('7. Testing CORS headers...');
  const corsResponse = await fetch(`${API_URL}/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET'
    }
  });

  console.log('   CORS Headers:');
  corsResponse.headers.forEach((value, key) => {
    if (key.startsWith('access-control')) {
      console.log(`     ${key}: ${value}`);
    }
  });
  console.log();

  // Test 6: Check database persistence
  console.log('8. Testing database persistence...');
  const servicesResponse = await apiRequest('GET', '/services', { token: leaderToken });
  console.log(`   Total services in DB: ${Array.isArray(servicesResponse.data) ? servicesResponse.data.length : 'N/A'}`);

  const songsResponse = await apiRequest('GET', '/songs', { token: leaderToken });
  console.log(`   Total songs in DB: ${Array.isArray(songsResponse.data) ? songsResponse.data.length : 'N/A'}`);

  const usersResponse = await apiRequest('GET', '/users/me', { token: leaderToken });
  console.log(`   Current user:`, usersResponse.data.email || 'N/A');
  console.log();

  console.log('=== Investigation Complete ===');
}

investigate();
