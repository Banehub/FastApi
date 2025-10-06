// Simple test script to demonstrate API usage
// Run this after starting the server with: node test-api.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  name: 'John',
  surname: 'Doe',
  cellNumber: '+1234567890',
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123'
};

async function testAPI() {
  try {
    console.log('🧪 Starting API tests...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // Test 2: Register user
    console.log('2. Testing user registration...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ Registration successful:', registerResponse.data);
    console.log('');

    // Test 3: Login user
    console.log('3. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', loginResponse.data);
    console.log('');

    // Test 4: Get user profile
    console.log('4. Testing user profile...');
    const token = loginResponse.data.data.token;
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieved:', profileResponse.data);
    console.log('');

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI, testUser };
