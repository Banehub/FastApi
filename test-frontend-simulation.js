// Test script to simulate frontend JSON encoding issues
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function simulateFrontendIssues() {
  try {
    console.log('🧪 Simulating frontend JSON encoding issues...\n');

    // Setup test user
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Frontend',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'frontend@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      console.log('✅ Test user registered');
    } catch (error) {
      if (error.response?.data?.message?.includes('already registered')) {
        console.log('✅ Test user already exists');
      }
    }

    // Login to get token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'frontend@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Test 1: Simulate React Native fetch with double JSON.stringify
    console.log('1. Testing React Native fetch simulation (double JSON.stringify)...');
    try {
      const exerciseData = { exercise_type: 'running' };
      const doubleStringified = JSON.stringify(JSON.stringify(exerciseData));
      
      console.log('Sending double-stringified data:', doubleStringified);
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, doubleStringified, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Double stringify test passed');
      
      // Stop the session
      await axios.put(`${API_BASE_URL}/exercise/stop/${response.data.session.id}`, {
        end_reason: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('❌ Double stringify test failed:', error.response?.data || error.message);
    }

    // Test 2: Simulate escaped JSON (common in some frameworks)
    console.log('\n2. Testing escaped JSON simulation...');
    try {
      const exerciseData = { exercise_type: 'cycling' };
      const escapedJson = JSON.stringify(exerciseData).replace(/"/g, '\\"');
      
      console.log('Sending escaped JSON:', escapedJson);
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, escapedJson, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Escaped JSON test passed');
      
      // Stop the session
      await axios.put(`${API_BASE_URL}/exercise/stop/${response.data.session.id}`, {
        end_reason: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('❌ Escaped JSON test failed:', error.response?.data || error.message);
    }

    // Test 3: Simulate the exact error from your logs
    console.log('\n3. Testing exact error simulation...');
    try {
      // This simulates the exact error: ""{\"exerci"... is not valid JSON
      const problematicData = '{"exercise_type":"walking"}';
      const wrappedInQuotes = `"${problematicData}"`;
      
      console.log('Sending problematic data:', wrappedInQuotes);
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, wrappedInQuotes, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Problematic data test passed');
      
      // Stop the session
      await axios.put(`${API_BASE_URL}/exercise/stop/${response.data.session.id}`, {
        end_reason: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('❌ Problematic data test failed:', error.response?.data || error.message);
    }

    // Test 4: Test with FormData simulation (common mistake)
    console.log('\n4. Testing FormData simulation...');
    try {
      const formData = new URLSearchParams();
      formData.append('exercise_type', 'swimming');
      
      const response = await axios.post(`${API_BASE_URL}/exercise/start`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('✅ FormData test passed');
      
      // Stop the session
      await axios.put(`${API_BASE_URL}/exercise/stop/${response.data.session.id}`, {
        end_reason: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('❌ FormData test failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Frontend simulation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
simulateFrontendIssues();
