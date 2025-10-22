const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User'
};

const testQuitTracking = {
  quitType: 'smoking',
  quitDate: '2024-01-15T00:00:00.000Z',
  daysQuit: 300
};

let authToken = '';

async function testQuitTrackingAPI() {
  console.log('🚭 Testing Quit Tracking API...\n');

  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        console.log('✅ User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Login to get auth token
    console.log('\n2. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Step 3: Test POST /api/quit-tracking/save
    console.log('\n3. Testing POST /api/quit-tracking/save...');
    const saveResponse = await axios.post(`${API_BASE_URL}/api/quit-tracking/save`, testQuitTracking, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Save quit tracking successful:', {
      success: saveResponse.data.success,
      message: saveResponse.data.message,
      data: saveResponse.data.data
    });

    // Step 4: Test GET /api/quit-tracking/get/:quitType
    console.log('\n4. Testing GET /api/quit-tracking/get/smoking...');
    const getResponse = await axios.get(`${API_BASE_URL}/api/quit-tracking/get/smoking`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get quit tracking successful:', {
      success: getResponse.data.success,
      data: getResponse.data.data
    });

    // Step 5: Test PUT /api/quit-tracking/update
    console.log('\n5. Testing PUT /api/quit-tracking/update...');
    const updateData = {
      quitType: 'smoking',
      quitDate: '2024-01-15T00:00:00.000Z',
      daysQuit: 350
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/api/quit-tracking/update`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Update quit tracking successful:', {
      success: updateResponse.data.success,
      message: updateResponse.data.message,
      data: updateResponse.data.data
    });

    // Step 6: Test GET /api/quit-tracking/all
    console.log('\n6. Testing GET /api/quit-tracking/all...');
    const getAllResponse = await axios.get(`${API_BASE_URL}/api/quit-tracking/all`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get all quit tracking successful:', {
      success: getAllResponse.data.success,
      count: getAllResponse.data.data.length,
      data: getAllResponse.data.data
    });

    // Step 7: Test adding vaping quit tracking
    console.log('\n7. Testing adding vaping quit tracking...');
    const vapingData = {
      quitType: 'vaping',
      quitDate: '2024-02-01T00:00:00.000Z',
      daysQuit: 250
    };
    
    const vapingResponse = await axios.post(`${API_BASE_URL}/api/quit-tracking/save`, vapingData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Save vaping quit tracking successful:', {
      success: vapingResponse.data.success,
      data: vapingResponse.data.data
    });

    // Step 8: Test GET /api/quit-tracking/get/vaping
    console.log('\n8. Testing GET /api/quit-tracking/get/vaping...');
    const getVapingResponse = await axios.get(`${API_BASE_URL}/api/quit-tracking/get/vaping`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get vaping quit tracking successful:', {
      success: getVapingResponse.data.success,
      data: getVapingResponse.data.data
    });

    // Step 9: Test DELETE /api/quit-tracking/delete/:quitType
    console.log('\n9. Testing DELETE /api/quit-tracking/delete/vaping...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/quit-tracking/delete/vaping`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Delete quit tracking successful:', {
      success: deleteResponse.data.success,
      message: deleteResponse.data.message
    });

    // Step 10: Verify deletion
    console.log('\n10. Verifying deletion...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/quit-tracking/get/vaping`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Verification successful:', {
      success: verifyResponse.data.success,
      data: verifyResponse.data.data
    });

    console.log('\n🎉 All quit tracking API tests passed!');

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
testQuitTrackingAPI();
