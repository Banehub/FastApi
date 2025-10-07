// Simple test for weight API
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testSimpleWeight() {
  try {
    console.log('🧪 Testing simple weight API...\n');

    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'weight@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Test adding multiple entries for today
    console.log('1. Testing multiple entries for today...');
    const today = new Date();
    
    try {
      const response1 = await axios.post(`${API_BASE_URL}/weight/add`, {
        weight: 73.0,
        date: today.toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ First entry added:', response1.data.entry.weight);
    } catch (error) {
      console.error('❌ First entry failed:', error.response?.data || error.message);
    }

    try {
      const response2 = await axios.post(`${API_BASE_URL}/weight/add`, {
        weight: 72.8,
        date: today.toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Second entry added:', response2.data.entry.weight);
    } catch (error) {
      console.error('❌ Second entry failed:', error.response?.data || error.message);
    }

    try {
      const response3 = await axios.post(`${API_BASE_URL}/weight/add`, {
        weight: 72.5,
        date: today.toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Third entry added:', response3.data.entry.weight);
    } catch (error) {
      console.error('❌ Third entry failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Simple weight test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleWeight();
