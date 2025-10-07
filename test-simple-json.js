// Simple test for JSON parsing
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testSimpleJson() {
  try {
    console.log('🧪 Testing simple JSON parsing...\n');

    // Setup test user
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Simple',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'simple@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      console.log('✅ Test user registered');
    } catch (error) {
      if (error.response?.data?.message?.includes('already registered')) {
        console.log('✅ Test user already exists');
      }
    }

    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'simple@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Test normal exercise start
    console.log('1. Testing normal exercise start...');
    const response = await axios.post(`${API_BASE_URL}/exercise/start`, {
      exercise_type: 'running'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Normal exercise start successful');
    console.log('Session ID:', response.data.session.id);

    // Stop the session
    await axios.put(`${API_BASE_URL}/exercise/stop/${response.data.session.id}`, {
      end_reason: 'completed'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Session stopped successfully');

    console.log('\n🎉 Simple JSON test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSimpleJson();
