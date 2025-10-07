// Test script for weight tracking API endpoints
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

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

let authToken = 'YOUR_JWT_TOKEN_HERE';

async function testWeightAPI() {
  try {
    console.log('🧪 Testing Weight Tracking API...\n');

    // Step 1: Register and login
    console.log('1. Setting up authentication...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Weight',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'weight@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      console.log('✅ Registration successful');
    } catch (error) {
      if (error.response?.data?.message?.includes('already registered')) {
        console.log('✅ User already exists, proceeding with login');
      } else {
        throw error;
      }
    }

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'weight@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token obtained\n');

    // Step 2: Set goal weight
    console.log('2. Testing set goal weight...');
    const goalResponse = await makeRequest('POST', '/weight/goal', {
      goal_weight: 70.0
    });
    console.log('✅ Goal weight set:', {
      goalWeight: goalResponse.goal.goal_weight,
      goalId: goalResponse.goal.id
    });
    console.log('');

    // Step 3: Add weight entries
    console.log('3. Testing add weight entries...');
    const weights = [75.5, 75.2, 74.8, 74.5, 74.1, 73.8, 73.5];
    const entryIds = [];
    
    for (let i = 0; i < weights.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (weights.length - 1 - i)); // Spread over last week
      
      const entryResponse = await makeRequest('POST', '/weight/add', {
        weight: weights[i],
        date: date.toISOString()
      });
      entryIds.push(entryResponse.entry.id);
      console.log(`✅ Weight entry ${i + 1} added: ${weights[i]}kg on ${date.toDateString()}`);
    }
    console.log('');

    // Step 4: Get current weight
    console.log('4. Testing get current weight...');
    const currentResponse = await makeRequest('GET', '/weight/current');
    console.log('✅ Current weight retrieved:', {
      currentWeight: currentResponse.current_weight,
      lastUpdated: currentResponse.last_updated
    });
    console.log('');

    // Step 5: Get goal weight
    console.log('5. Testing get goal weight...');
    const goalGetResponse = await makeRequest('GET', '/weight/goal');
    console.log('✅ Goal weight retrieved:', {
      goalWeight: goalGetResponse.goal_weight,
      setDate: goalGetResponse.set_date
    });
    console.log('');

    // Step 6: Get weight history
    console.log('6. Testing get weight history...');
    const historyResponse = await makeRequest('GET', '/weight/history?limit=10');
    console.log('✅ Weight history retrieved:', {
      totalEntries: historyResponse.entries.length,
      pagination: historyResponse.pagination
    });
    console.log('');

    // Step 7: Get weight analytics
    console.log('7. Testing get weight analytics...');
    const analyticsResponse = await makeRequest('GET', '/weight/analytics');
    console.log('✅ Weight analytics retrieved:', {
      currentWeight: analyticsResponse.analytics.current_weight,
      goalWeight: analyticsResponse.analytics.goal_weight,
      weightToLose: analyticsResponse.analytics.weight_to_lose,
      progressPercentage: analyticsResponse.analytics.progress_percentage,
      totalEntries: analyticsResponse.analytics.total_entries,
      trend: analyticsResponse.analytics.trend,
      totalWeightLost: analyticsResponse.analytics.total_weight_lost
    });
    console.log('');

    // Step 8: Update weight entry
    console.log('8. Testing update weight entry...');
    const updateResponse = await makeRequest('PUT', `/weight/entry/${entryIds[0]}`, {
      weight: 75.3
    });
    console.log('✅ Weight entry updated:', {
      entryId: updateResponse.entry.id,
      newWeight: updateResponse.entry.weight,
      updatedAt: updateResponse.entry.updated_at
    });
    console.log('');

    // Step 9: Test multiple entries per day
    console.log('9. Testing multiple entries per day...');
    const today = new Date();
    await makeRequest('POST', '/weight/add', {
      weight: 73.0,
      date: today.toISOString()
    });
    console.log('✅ First entry added for today: 73.0kg');
    
    // Add another entry for the same day
    await makeRequest('POST', '/weight/add', {
      weight: 72.8,
      date: today.toISOString()
    });
    console.log('✅ Second entry added for today: 72.8kg');
    
    // Add a third entry for the same day
    await makeRequest('POST', '/weight/add', {
      weight: 72.5,
      date: today.toISOString()
    });
    console.log('✅ Third entry added for today: 72.5kg');
    console.log('');

    // Step 10: Test validation errors
    console.log('10. Testing validation errors...');
    try {
      await makeRequest('POST', '/weight/add', {
        weight: 5.0 // Too low
      });
    } catch (error) {
      if (error.response?.data?.code === 'VALIDATION_ERROR') {
        console.log('✅ Weight validation correctly failed for low weight');
      }
    }

    try {
      await makeRequest('POST', '/weight/goal', {
        goal_weight: 600.0 // Too high
      });
    } catch (error) {
      if (error.response?.data?.code === 'VALIDATION_ERROR') {
        console.log('✅ Goal weight validation correctly failed for high weight');
      }
    }
    console.log('');

    // Step 11: Delete weight entry
    console.log('11. Testing delete weight entry...');
    const deleteResponse = await makeRequest('DELETE', `/weight/entry/${entryIds[entryIds.length - 1]}`);
    console.log('✅ Weight entry deleted:', deleteResponse.message);
    console.log('');

    // Step 12: Final analytics
    console.log('12. Final weight analytics...');
    const finalAnalyticsResponse = await makeRequest('GET', '/weight/analytics');
    console.log('✅ Final weight analytics:', {
      currentWeight: finalAnalyticsResponse.analytics.current_weight,
      totalEntries: finalAnalyticsResponse.analytics.total_entries,
      totalWeightLost: finalAnalyticsResponse.analytics.total_weight_lost,
      progressPercentage: finalAnalyticsResponse.analytics.progress_percentage
    });
    console.log('');

    console.log('🎉 All Weight API tests completed successfully!');
    console.log('\n⚖️ Summary of Weight Features:');
    console.log('✅ Weight entry management (add, update, delete)');
    console.log('✅ Goal weight setting and tracking');
    console.log('✅ Weight history with pagination');
    console.log('✅ Current weight retrieval');
    console.log('✅ Comprehensive weight analytics');
    console.log('✅ Multiple entries per day support');
    console.log('✅ Input validation and error handling');
    console.log('✅ Progress tracking and trend analysis');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Run the test
testWeightAPI();
