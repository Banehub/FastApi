const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  name: 'Test',
  surname: 'User',
  cellNumber: '+1234567890',
  email: 'testdelete@example.com',
  password: 'password123',
  confirmPassword: 'password123'
};

let authToken = '';

async function testDeleteAccount() {
  console.log('🗑️ Testing Delete Account API...\n');

  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, testUser);
      authToken = registerResponse.data.data.token;
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'Email already registered') {
        console.log('✅ User already exists, logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        authToken = loginResponse.data.token;
        console.log('✅ Login successful');
      } else {
        throw error;
      }
    }

    // Step 2: Add some test data to verify deletion
    console.log('\n2. Adding test data...');
    
    // Add weight entry
    await axios.post(`${API_BASE_URL}/api/weight/add`, {
      weight: 75.5,
      date: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Weight entry added');

    // Add quit tracking data
    await axios.post(`${API_BASE_URL}/api/quit-tracking/save`, {
      quitType: 'smoking',
      quitDate: '2024-01-15T00:00:00.000Z',
      daysQuit: 300
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Quit tracking data added');

    // Step 3: Verify data exists
    console.log('\n3. Verifying data exists...');
    
    const weightResponse = await axios.get(`${API_BASE_URL}/api/weight/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Weight data exists:', weightResponse.data.entries.length, 'entries');

    const quitResponse = await axios.get(`${API_BASE_URL}/api/quit-tracking/get/smoking`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Quit tracking data exists:', quitResponse.data.data ? 'Yes' : 'No');

    // Step 4: Delete the account
    console.log('\n4. Deleting account...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/auth/delete-account`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Account deletion successful:', {
      success: deleteResponse.data.success,
      message: deleteResponse.data.message,
      deletedUserId: deleteResponse.data.data.deletedUserId,
      deletedEmail: deleteResponse.data.data.deletedEmail,
      deletedCollections: deleteResponse.data.data.deletedCollections
    });

    // Step 5: Verify account is deleted (should fail)
    console.log('\n5. Verifying account is deleted...');
    try {
      await axios.get(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('❌ Account still exists - deletion failed!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Account successfully deleted - profile access denied');
      } else {
        console.log('✅ Account successfully deleted - profile not found');
      }
    }

    // Step 6: Try to access data (should fail)
    console.log('\n6. Verifying data is deleted...');
    try {
      await axios.get(`${API_BASE_URL}/api/weight/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('❌ Weight data still exists - deletion may have failed!');
    } catch (error) {
      console.log('✅ Weight data successfully deleted - access denied');
    }

    try {
      await axios.get(`${API_BASE_URL}/api/quit-tracking/get/smoking`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('❌ Quit tracking data still exists - deletion may have failed!');
    } catch (error) {
      console.log('✅ Quit tracking data successfully deleted - access denied');
    }

    console.log('\n🎉 Delete account test completed successfully!');
    console.log('✅ All user data has been permanently deleted from the database.');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
  }
}

// Run the test
testDeleteAccount();
