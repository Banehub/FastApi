// Simple JWT authentication test
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testJWTAuth() {
  try {
    console.log('🧪 Testing JWT Authentication...\n');

    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'JWT',
      surname: 'Test',
      cellNumber: '+1234567890',
      email: 'jwttest@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('');

    // Step 2: Login to get JWT token
    console.log('2. Logging in to get JWT token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'jwttest@example.com',
      password: 'password123'
    });
    
    const { user, token } = loginResponse.data;
    console.log('✅ Login successful:');
    console.log('   User ID:', user.id);
    console.log('   Token preview:', token.substring(0, 30) + '...');
    console.log('');

    // Step 3: Test JWT authentication with fasting API
    console.log('3. Testing JWT authentication with fasting API...');
    const fastingResponse = await axios.post(`${API_BASE_URL}/fasting/start`, {
      start_type: 'immediate'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Fasting session started successfully:', fastingResponse.data);
    console.log('');

    // Step 4: Test getting current session
    console.log('4. Testing get current session...');
    const currentResponse = await axios.get(`${API_BASE_URL}/fasting/current`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Current session retrieved:', currentResponse.data);
    console.log('');

    console.log('🎉 JWT Authentication test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Run the test
testJWTAuth();
