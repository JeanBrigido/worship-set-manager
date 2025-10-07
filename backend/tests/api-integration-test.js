/**
 * API Integration Test Script
 * Tests all API endpoints for the Worship Set Manager application
 */

const API_URL = 'http://localhost:3002';

// Test results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Authentication tokens (to be populated after login)
let adminToken = null;
let leaderToken = null;
let musicianToken = null;

// Test resource IDs (to be populated during tests)
let testServiceId = null;
let testSongId = null;
let testAssignmentId = null;
let testSuggestionSlotId = null;

/**
 * Log test result
 */
function logResult(category, endpoint, method, status, expected, actual, message) {
  const test = {
    category,
    endpoint,
    method,
    status,
    expected,
    actual,
    message,
    passed: status === 'PASS'
  };

  results.tests.push(test);
  results.total++;

  if (status === 'PASS') {
    results.passed++;
    console.log(`${colors.green}✓ PASS${colors.reset} [${category}] ${method} ${endpoint}: ${message}`);
  } else if (status === 'FAIL') {
    results.failed++;
    console.log(`${colors.red}✗ FAIL${colors.reset} [${category}] ${method} ${endpoint}: ${message}`);
    console.log(`  Expected: ${expected}, Got: ${actual}`);
  } else if (status === 'WARN') {
    results.warnings++;
    console.log(`${colors.yellow}⚠ WARN${colors.reset} [${category}] ${method} ${endpoint}: ${message}`);
  }
}

/**
 * Make API request
 */
async function apiRequest(method, endpoint, options = {}) {
  const { body, token, expectError = false } = options;

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
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log(`\n${colors.cyan}=== Testing Health Check ===${colors.reset}`);

  const response = await apiRequest('GET', '/health');

  if (response.status === 200 && response.data.status === 'ok') {
    logResult('Health', '/health', 'GET', 'PASS', '200', response.status, 'Server is running');
  } else {
    logResult('Health', '/health', 'GET', 'FAIL', '200', response.status, 'Server health check failed');
  }
}

/**
 * Test 2: Authentication - Signup
 */
async function testSignup() {
  console.log(`\n${colors.cyan}=== Testing Authentication - Signup ===${colors.reset}`);

  // Test valid signup
  const validSignup = {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User'
  };

  const response = await apiRequest('POST', '/users/signup', { body: validSignup });

  if (response.status === 201) {
    logResult('Auth', '/users/signup', 'POST', 'PASS', '201', response.status, 'Signup successful');
  } else {
    logResult('Auth', '/users/signup', 'POST', 'FAIL', '201', response.status, 'Signup failed');
  }

  // Test invalid signup (missing fields)
  const invalidSignup = {
    email: 'invalid@example.com'
  };

  const invalidResponse = await apiRequest('POST', '/users/signup', { body: invalidSignup });

  if (invalidResponse.status === 400) {
    logResult('Auth', '/users/signup', 'POST', 'PASS', '400', invalidResponse.status, 'Validation error for invalid data');
  } else {
    logResult('Auth', '/users/signup', 'POST', 'FAIL', '400', invalidResponse.status, 'Should reject invalid signup data');
  }
}

/**
 * Test 3: Authentication - Login
 */
async function testLogin() {
  console.log(`\n${colors.cyan}=== Testing Authentication - Login ===${colors.reset}`);

  // Test login for each role
  const credentials = [
    { email: 'admin@test.com', password: 'password123', role: 'admin' },
    { email: 'leader@test.com', password: 'password123', role: 'leader' },
    { email: 'musician@test.com', password: 'password123', role: 'musician' }
  ];

  for (const cred of credentials) {
    const response = await apiRequest('POST', '/users/login', {
      body: { email: cred.email, password: cred.password }
    });

    if (response.status === 200 && response.data.token) {
      // Store tokens for later use
      if (cred.role === 'admin') adminToken = response.data.token;
      if (cred.role === 'leader') leaderToken = response.data.token;
      if (cred.role === 'musician') musicianToken = response.data.token;

      logResult('Auth', '/users/login', 'POST', 'PASS', '200', response.status, `${cred.role} login successful`);
    } else {
      logResult('Auth', '/users/login', 'POST', 'FAIL', '200', response.status, `${cred.role} login failed`);
    }
  }

  // Test invalid credentials
  const invalidResponse = await apiRequest('POST', '/users/login', {
    body: { email: 'admin@test.com', password: 'wrongpassword' }
  });

  if (invalidResponse.status === 401) {
    logResult('Auth', '/users/login', 'POST', 'PASS', '401', invalidResponse.status, 'Rejected invalid credentials');
  } else {
    logResult('Auth', '/users/login', 'POST', 'FAIL', '401', invalidResponse.status, 'Should reject invalid credentials');
  }
}

/**
 * Test 4: Users API
 */
async function testUsersAPI() {
  console.log(`\n${colors.cyan}=== Testing Users API ===${colors.reset}`);

  // Test unauthenticated access
  const unauthResponse = await apiRequest('GET', '/users');
  if (unauthResponse.status === 401) {
    logResult('Users', '/users', 'GET', 'PASS', '401', unauthResponse.status, 'Rejected unauthenticated request');
  } else {
    logResult('Users', '/users', 'GET', 'FAIL', '401', unauthResponse.status, 'Should require authentication');
  }

  // Test list users (admin only)
  const adminListResponse = await apiRequest('GET', '/users', { token: adminToken });
  if (adminListResponse.status === 200) {
    logResult('Users', '/users', 'GET', 'PASS', '200', adminListResponse.status, 'Admin can list users');
  } else {
    logResult('Users', '/users', 'GET', 'FAIL', '200', adminListResponse.status, 'Admin should be able to list users');
  }

  // Test list users as musician (should fail)
  const musicianListResponse = await apiRequest('GET', '/users', { token: musicianToken });
  if (musicianListResponse.status === 403) {
    logResult('Users', '/users', 'GET', 'PASS', '403', musicianListResponse.status, 'Musician cannot list all users');
  } else {
    logResult('Users', '/users', 'GET', 'FAIL', '403', musicianListResponse.status, 'Should restrict musician access');
  }

  // Test get current user
  const meResponse = await apiRequest('GET', '/users/me', { token: adminToken });
  if (meResponse.status === 200 && meResponse.data.email) {
    logResult('Users', '/users/me', 'GET', 'PASS', '200', meResponse.status, 'Retrieved current user');
  } else {
    logResult('Users', '/users/me', 'GET', 'FAIL', '200', meResponse.status, 'Failed to get current user');
  }
}

/**
 * Test 5: Services API
 */
async function testServicesAPI() {
  console.log(`\n${colors.cyan}=== Testing Services API ===${colors.reset}`);

  // Test create service (leader)
  const newService = {
    serviceType: 'Sunday',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    theme: 'Test Service'
  };

  const createResponse = await apiRequest('POST', '/services', {
    token: leaderToken,
    body: newService
  });

  if (createResponse.status === 201 && createResponse.data.id) {
    testServiceId = createResponse.data.id;
    logResult('Services', '/services', 'POST', 'PASS', '201', createResponse.status, 'Leader created service');
  } else {
    logResult('Services', '/services', 'POST', 'FAIL', '201', createResponse.status, 'Failed to create service');
  }

  // Test create service as musician (should fail)
  const musicianCreateResponse = await apiRequest('POST', '/services', {
    token: musicianToken,
    body: newService
  });

  if (musicianCreateResponse.status === 403) {
    logResult('Services', '/services', 'POST', 'PASS', '403', musicianCreateResponse.status, 'Musician cannot create service');
  } else {
    logResult('Services', '/services', 'POST', 'FAIL', '403', musicianCreateResponse.status, 'Should restrict musician access');
  }

  // Test list services
  const listResponse = await apiRequest('GET', '/services', { token: musicianToken });
  if (listResponse.status === 200 && Array.isArray(listResponse.data)) {
    logResult('Services', '/services', 'GET', 'PASS', '200', listResponse.status, 'Listed services');
  } else {
    logResult('Services', '/services', 'GET', 'FAIL', '200', listResponse.status, 'Failed to list services');
  }

  // Test get service
  if (testServiceId) {
    const getResponse = await apiRequest('GET', `/services/${testServiceId}`, { token: musicianToken });
    if (getResponse.status === 200) {
      logResult('Services', `/services/${testServiceId}`, 'GET', 'PASS', '200', getResponse.status, 'Retrieved service');
    } else {
      logResult('Services', `/services/${testServiceId}`, 'GET', 'FAIL', '200', getResponse.status, 'Failed to get service');
    }

    // Test update service
    const updateResponse = await apiRequest('PUT', `/services/${testServiceId}`, {
      token: leaderToken,
      body: { theme: 'Updated Theme' }
    });

    if (updateResponse.status === 200) {
      logResult('Services', `/services/${testServiceId}`, 'PUT', 'PASS', '200', updateResponse.status, 'Updated service');
    } else {
      logResult('Services', `/services/${testServiceId}`, 'PUT', 'FAIL', '200', updateResponse.status, 'Failed to update service');
    }
  }
}

/**
 * Test 6: Songs API
 */
async function testSongsAPI() {
  console.log(`\n${colors.cyan}=== Testing Songs API ===${colors.reset}`);

  // Test list songs
  const listResponse = await apiRequest('GET', '/songs', { token: musicianToken });
  if (listResponse.status === 200 && Array.isArray(listResponse.data)) {
    logResult('Songs', '/songs', 'GET', 'PASS', '200', listResponse.status, 'Listed songs');
    if (listResponse.data.length > 0) {
      testSongId = listResponse.data[0].id;
    }
  } else {
    logResult('Songs', '/songs', 'GET', 'FAIL', '200', listResponse.status, 'Failed to list songs');
  }

  // Test create song (leader)
  const newSong = {
    title: `Test Song ${Date.now()}`,
    artist: 'Test Artist',
    key: 'C',
    tempo: 120
  };

  const createResponse = await apiRequest('POST', '/songs', {
    token: leaderToken,
    body: newSong
  });

  if (createResponse.status === 201) {
    testSongId = createResponse.data.id;
    logResult('Songs', '/songs', 'POST', 'PASS', '201', createResponse.status, 'Created song');
  } else {
    logResult('Songs', '/songs', 'POST', 'FAIL', '201', createResponse.status, 'Failed to create song');
  }

  // Test get song
  if (testSongId) {
    const getResponse = await apiRequest('GET', `/songs/${testSongId}`, { token: musicianToken });
    if (getResponse.status === 200) {
      logResult('Songs', `/songs/${testSongId}`, 'GET', 'PASS', '200', getResponse.status, 'Retrieved song');
    } else {
      logResult('Songs', `/songs/${testSongId}`, 'GET', 'FAIL', '200', getResponse.status, 'Failed to get song');
    }
  }
}

/**
 * Test 7: Assignments API
 */
async function testAssignmentsAPI() {
  console.log(`\n${colors.cyan}=== Testing Assignments API ===${colors.reset}`);

  // Test list assignments
  const listResponse = await apiRequest('GET', '/assignments', { token: musicianToken });
  if (listResponse.status === 200) {
    logResult('Assignments', '/assignments', 'GET', 'PASS', '200', listResponse.status, 'Listed assignments');
  } else {
    logResult('Assignments', '/assignments', 'GET', 'FAIL', '200', listResponse.status, 'Failed to list assignments');
  }

  // Test create assignment (requires service and instrument)
  if (testServiceId) {
    // Get instruments first
    const instrumentsResponse = await apiRequest('GET', '/instruments', { token: leaderToken });
    if (instrumentsResponse.status === 200 && instrumentsResponse.data.length > 0) {
      const instrumentId = instrumentsResponse.data[0].id;

      // Get users
      const usersResponse = await apiRequest('GET', '/users', { token: adminToken });
      if (usersResponse.status === 200 && usersResponse.data.length > 0) {
        const userId = usersResponse.data[0].id;

        const newAssignment = {
          serviceId: testServiceId,
          instrumentId: instrumentId,
          userId: userId
        };

        const createResponse = await apiRequest('POST', '/assignments', {
          token: leaderToken,
          body: newAssignment
        });

        if (createResponse.status === 201) {
          testAssignmentId = createResponse.data.id;
          logResult('Assignments', '/assignments', 'POST', 'PASS', '201', createResponse.status, 'Created assignment');
        } else {
          logResult('Assignments', '/assignments', 'POST', 'FAIL', '201', createResponse.status, 'Failed to create assignment');
        }
      }
    }
  }
}

/**
 * Test 8: Suggestions API
 */
async function testSuggestionsAPI() {
  console.log(`\n${colors.cyan}=== Testing Suggestions API ===${colors.reset}`);

  // Test list suggestion slots
  const slotsResponse = await apiRequest('GET', '/suggestion-slots', { token: musicianToken });
  if (slotsResponse.status === 200) {
    logResult('Suggestions', '/suggestion-slots', 'GET', 'PASS', '200', slotsResponse.status, 'Listed suggestion slots');
  } else {
    logResult('Suggestions', '/suggestion-slots', 'GET', 'FAIL', '200', slotsResponse.status, 'Failed to list suggestion slots');
  }

  // Test list suggestions
  const suggestionsResponse = await apiRequest('GET', '/suggestions', { token: musicianToken });
  if (suggestionsResponse.status === 200) {
    logResult('Suggestions', '/suggestions', 'GET', 'PASS', '200', suggestionsResponse.status, 'Listed suggestions');
  } else {
    logResult('Suggestions', '/suggestions', 'GET', 'FAIL', '200', suggestionsResponse.status, 'Failed to list suggestions');
  }
}

/**
 * Test 9: CORS Configuration
 */
async function testCORS() {
  console.log(`\n${colors.cyan}=== Testing CORS Configuration ===${colors.reset}`);

  const response = await apiRequest('OPTIONS', '/health');

  if (response.headers) {
    const corsHeaders = response.headers.get('access-control-allow-origin');
    if (corsHeaders) {
      logResult('CORS', '/health', 'OPTIONS', 'PASS', 'CORS headers present', 'Present', 'CORS configured');
    } else {
      logResult('CORS', '/health', 'OPTIONS', 'WARN', 'CORS headers', 'Not found', 'CORS headers not detected');
    }
  }
}

/**
 * Test 10: Error Handling
 */
async function testErrorHandling() {
  console.log(`\n${colors.cyan}=== Testing Error Handling ===${colors.reset}`);

  // Test 404 for non-existent endpoint
  const notFoundResponse = await apiRequest('GET', '/nonexistent', { token: adminToken });
  if (notFoundResponse.status === 404) {
    logResult('Error', '/nonexistent', 'GET', 'PASS', '404', notFoundResponse.status, '404 for non-existent endpoint');
  } else {
    logResult('Error', '/nonexistent', 'GET', 'FAIL', '404', notFoundResponse.status, 'Should return 404');
  }

  // Test 404 for non-existent resource
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const notFoundResourceResponse = await apiRequest('GET', `/services/${fakeId}`, { token: adminToken });
  if (notFoundResourceResponse.status === 404) {
    logResult('Error', `/services/${fakeId}`, 'GET', 'PASS', '404', notFoundResourceResponse.status, '404 for non-existent resource');
  } else {
    logResult('Error', `/services/${fakeId}`, 'GET', 'FAIL', '404', notFoundResourceResponse.status, 'Should return 404 for non-existent resource');
  }

  // Test validation error
  const invalidService = {
    serviceType: 'InvalidType',
    date: 'invalid-date'
  };

  const validationResponse = await apiRequest('POST', '/services', {
    token: leaderToken,
    body: invalidService
  });

  if (validationResponse.status === 400) {
    logResult('Error', '/services', 'POST', 'PASS', '400', validationResponse.status, 'Validation error for invalid data');
  } else {
    logResult('Error', '/services', 'POST', 'FAIL', '400', validationResponse.status, 'Should return 400 for validation errors');
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.magenta}API Integration Test Report${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);

  console.log(`${colors.cyan}Test Summary:${colors.reset}`);
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  console.log(`  Pass Rate: ${((results.passed / results.total) * 100).toFixed(2)}%\n`);

  // Group results by category
  const categories = {};
  results.tests.forEach(test => {
    if (!categories[test.category]) {
      categories[test.category] = { passed: 0, failed: 0, warnings: 0 };
    }
    if (test.status === 'PASS') categories[test.category].passed++;
    if (test.status === 'FAIL') categories[test.category].failed++;
    if (test.status === 'WARN') categories[test.category].warnings++;
  });

  console.log(`${colors.cyan}Results by Category:${colors.reset}`);
  Object.keys(categories).forEach(cat => {
    const stats = categories[cat];
    const total = stats.passed + stats.failed + stats.warnings;
    console.log(`  ${cat}: ${stats.passed}/${total} passed`);
  });

  // List all failures
  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  ✗ [${t.category}] ${t.method} ${t.endpoint}`);
        console.log(`    ${t.message}`);
        console.log(`    Expected: ${t.expected}, Got: ${t.actual}\n`);
      });
  }

  console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.magenta}Worship Set Manager - API Integration Tests${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
  console.log(`API URL: ${API_URL}\n`);

  try {
    await testHealthCheck();
    await testSignup();
    await testLogin();
    await testUsersAPI();
    await testServicesAPI();
    await testSongsAPI();
    await testAssignmentsAPI();
    await testSuggestionsAPI();
    await testCORS();
    await testErrorHandling();

    generateReport();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run tests
runTests();
