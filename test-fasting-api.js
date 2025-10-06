// Test script for fasting API endpoints
// Run this after starting the server and getting a valid JWT token

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// You need to get a valid JWT token first by logging in
// Replace this with a real token from your login response
let authToken = 'YOUR_JWT_TOKEN_HERE';

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Request failed:', error.response?.data || error.message);
    throw error;
  }
};

async function testFastingAPI() {
  try {
    console.log('🧪 Starting Fasting API tests...\n');

    // Test 1: Get current session (should be null initially)
    console.log('1. Testing get current session...');
    const currentSession = await makeRequest('GET', '/fasting/current');
    console.log('✅ Current session:', currentSession);
    console.log('');

    // Test 2: Start immediate fasting session
    console.log('2. Testing start immediate fasting session...');
    const startImmediate = await makeRequest('POST', '/fasting/start', {
      start_type: 'immediate'
    });
    console.log('✅ Started immediate session:', startImmediate);
    const sessionId = startImmediate.session.id;
    console.log('');

    // Test 3: Get current session (should show active session)
    console.log('3. Testing get current session (should show active)...');
    const currentActive = await makeRequest('GET', '/fasting/current');
    console.log('✅ Current active session:', currentActive);
    console.log('');

    // Test 4: Try to start another session (should fail)
    console.log('4. Testing start another session (should fail)...');
    try {
      await makeRequest('POST', '/fasting/start', {
        start_type: 'immediate'
      });
    } catch (error) {
      console.log('✅ Correctly prevented duplicate session:', error.response.data);
    }
    console.log('');

    // Test 5: Stop the session
    console.log('5. Testing stop session...');
    const stopSession = await makeRequest('PUT', `/fasting/stop/${sessionId}`);
    console.log('✅ Stopped session:', stopSession);
    console.log('');

    // Test 6: Start custom fasting session
    console.log('6. Testing start custom fasting session...');
    const startCustom = await makeRequest('POST', '/fasting/start', {
      start_type: 'custom',
      custom_start_hours: 2,
      custom_start_minutes: 30
    });
    console.log('✅ Started custom session:', startCustom);
    const customSessionId = startCustom.session.id;
    console.log('');

    // Test 7: Get all sessions
    console.log('7. Testing get all sessions...');
    const allSessions = await makeRequest('GET', '/fasting/sessions?page=1&limit=10');
    console.log('✅ All sessions:', allSessions);
    console.log('');

    // Test 8: Stop custom session
    console.log('8. Testing stop custom session...');
    const stopCustom = await makeRequest('PUT', `/fasting/stop/${customSessionId}`);
    console.log('✅ Stopped custom session:', stopCustom);
    console.log('');

    // Test 9: Get sessions with filters
    console.log('9. Testing get completed sessions...');
    const completedSessions = await makeRequest('GET', '/fasting/sessions?status=completed&limit=5');
    console.log('✅ Completed sessions:', completedSessions);
    console.log('');

    console.log('🎉 All fasting API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Instructions for getting a token
async function getAuthToken() {
  try {
    console.log('🔐 Getting authentication token...');
    
    // First register a test user
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Test',
      surname: 'User',
      cellNumber: '+1234567890',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    console.log('✅ User registered:', registerResponse.data.message);
    
    // Then login to get token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.data.token;
    console.log('✅ Token obtained:', authToken.substring(0, 20) + '...');
    
    return authToken;
  } catch (error) {
    console.error('❌ Failed to get token:', error.response?.data || error.message);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await getAuthToken();
      await testFastingAPI();
    } catch (error) {
      console.error('Setup failed:', error.message);
    }
  })();
}

module.exports = { testFastingAPI, getAuthToken };
