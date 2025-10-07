// Debug script to test JSON parsing issues
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testJsonParsing() {
  try {
    console.log('🧪 Testing JSON parsing with different formats...\n');

    // First, register a user for testing
    console.log('0. Setting up test user...');
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'JSON',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'json@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      console.log('✅ Test user registered');
    } catch (error) {
      if (error.response?.data?.message?.includes('already registered')) {
        console.log('✅ Test user already exists');
      } else {
        throw error;
      }
    }

    // Test 1: Normal JSON
    console.log('1. Testing normal JSON format...');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'json@example.com',
        password: 'password123'
      });
      console.log('✅ Normal JSON works');
      const token = response.data.token;
      
      // Test 2: Exercise start with normal JSON
      console.log('2. Testing exercise start with normal JSON...');
      const exerciseResponse = await axios.post(`${API_BASE_URL}/exercise/start`, {
        exercise_type: 'running'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Exercise start with normal JSON works');
      
      // Stop the session
      await axios.put(`${API_BASE_URL}/exercise/stop/${exerciseResponse.data.session.id}`, {
        end_reason: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('❌ Normal JSON test failed:', error.response?.data || error.message);
    }

    // Test 3: Test with stringified JSON (potential double encoding)
    console.log('\n3. Testing with potentially double-encoded JSON...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'json@example.com',
        password: 'password123'
      });
      const token = loginResponse.data.token;
      
      // This simulates what might happen with double encoding
      const exerciseData = JSON.stringify({
        exercise_type: 'cycling'
      });
      
      console.log('Sending data:', exerciseData);
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, exerciseData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Double-encoded JSON test passed');
      
    } catch (error) {
      console.error('❌ Double-encoded JSON test failed:', error.response?.data || error.message);
    }

    // Test 4: Test with malformed JSON
    console.log('\n4. Testing with malformed JSON...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'json@example.com',
        password: 'password123'
      });
      const token = loginResponse.data.token;
      
      // This will cause a JSON parsing error
      const malformedData = '{"exercise_type": "running"'; // Missing closing brace
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, malformedData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Malformed JSON test passed (unexpected)');
      
    } catch (error) {
      console.error('❌ Malformed JSON test failed (expected):', error.response?.data || error.message);
    }

    // Test 5: Test with different content types
    console.log('\n5. Testing with different content types...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'json@example.com',
        password: 'password123'
      });
      const token = loginResponse.data.token;
      
      // Test with text/plain content type
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, {
        exercise_type: 'walking'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        }
      });
      console.log('✅ Different content type test passed');
      
    } catch (error) {
      console.error('❌ Different content type test failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 JSON parsing tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testJsonParsing();
