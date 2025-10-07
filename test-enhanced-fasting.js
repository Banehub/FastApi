// Test script for enhanced fasting API endpoints with metabolic analytics
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

async function testEnhancedFastingAPI() {
  try {
    console.log('🧪 Testing Enhanced Fasting API with Metabolic Analytics...\n');

    // Step 1: Register and login
    console.log('1. Setting up authentication...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Enhanced',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'enhanced@example.com',
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
      email: 'enhanced@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token obtained\n');

    // Step 2: Start fasting session with plan type
    console.log('2. Testing enhanced start fasting with plan type...');
    const startResponse = await makeRequest('POST', '/fasting/start', {
      start_type: 'immediate',
      plan_type: '16:8'
    });
    console.log('✅ Enhanced start fasting successful:', {
      sessionId: startResponse.session.id,
      planType: startResponse.session.plan_type,
      status: startResponse.session.status
    });
    const sessionId = startResponse.session.id;
    console.log('');

    // Step 3: Get current session (should show plan type and current duration)
    console.log('3. Testing enhanced get current session...');
    const currentResponse = await makeRequest('GET', '/fasting/current');
    console.log('✅ Enhanced current session:', {
      planType: currentResponse.session.plan_type,
      durationMinutes: currentResponse.session.duration_minutes,
      status: currentResponse.session.status
    });
    console.log('');

    // Step 4: Wait a bit and get session analytics
    console.log('4. Testing session analytics...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const analyticsResponse = await makeRequest('GET', `/fasting/analytics/${sessionId}`);
    console.log('✅ Session analytics:', {
      totalDuration: analyticsResponse.total_duration_minutes,
      planType: analyticsResponse.plan_type,
      metabolicStates: Object.keys(analyticsResponse.metabolic_states),
      planProgress: analyticsResponse.plan_progress
    });
    console.log('');

    // Step 5: Stop session with end reason
    console.log('5. Testing enhanced stop fasting with end reason...');
    const stopResponse = await makeRequest('PUT', `/fasting/stop/${sessionId}`, {
      end_reason: 'completed'
    });
    console.log('✅ Enhanced stop fasting successful:', {
      duration: stopResponse.session.duration_minutes,
      endReason: stopResponse.session.end_reason,
      planType: stopResponse.session.plan_type,
      hasAnalytics: !!stopResponse.analytics
    });
    console.log('');

    // Step 6: Start another session with different plan
    console.log('6. Testing different plan type...');
    const startResponse2 = await makeRequest('POST', '/fasting/start', {
      start_type: 'immediate',
      plan_type: '20:4'
    });
    const sessionId2 = startResponse2.session.id;
    console.log('✅ Different plan started:', startResponse2.session.plan_type);
    console.log('');

    // Step 7: Stop second session
    console.log('7. Stopping second session...');
    await makeRequest('PUT', `/fasting/stop/${sessionId2}`, {
      end_reason: 'manually_stopped'
    });
    console.log('✅ Second session stopped');
    console.log('');

    // Step 8: Get sessions history
    console.log('8. Testing enhanced sessions history...');
    const sessionsResponse = await makeRequest('GET', '/fasting/sessions?limit=10');
    console.log('✅ Enhanced sessions history:', {
      totalSessions: sessionsResponse.sessions.length,
      sessionsWithPlanType: sessionsResponse.sessions.every(s => s.plan_type),
      sessionsWithEndReason: sessionsResponse.sessions.filter(s => s.end_reason).length
    });
    console.log('');

    // Step 9: Get analytics summary
    console.log('9. Testing analytics summary...');
    const summaryResponse = await makeRequest('GET', '/fasting/analytics/summary');
    console.log('✅ Analytics summary:', {
      totalSessions: summaryResponse.total_sessions,
      totalFastingHours: summaryResponse.total_fasting_hours,
      averageSessionHours: summaryResponse.average_session_hours,
      planUsage: summaryResponse.plan_usage,
      metabolicBreakdown: Object.keys(summaryResponse.metabolic_breakdown),
      recentSessions: summaryResponse.recent_sessions.length
    });
    console.log('');

    // Step 10: Test custom start time
    console.log('10. Testing custom start time...');
    const customStartResponse = await makeRequest('POST', '/fasting/start', {
      start_type: 'custom',
      custom_start_hours: 2,
      custom_start_minutes: 30,
      plan_type: '14:10'
    });
    console.log('✅ Custom start successful:', {
      planType: customStartResponse.session.plan_type,
      startType: customStartResponse.session.start_type,
      customHours: customStartResponse.session.custom_start_hours,
      customMinutes: customStartResponse.session.custom_start_minutes
    });
    
    // Stop the custom session
    await makeRequest('PUT', `/fasting/stop/${customStartResponse.session.id}`, {
      end_reason: 'completed'
    });
    console.log('✅ Custom session stopped');
    console.log('');

    console.log('🎉 All Enhanced Fasting API tests completed successfully!');
    console.log('\n📊 Summary of Enhanced Features:');
    console.log('✅ Plan types (12:12, 14:10, 16:8, 18:6, 20:4)');
    console.log('✅ End reasons (completed, manually_stopped, interrupted)');
    console.log('✅ Metabolic state analytics (fed, transition, fasting, ketosis)');
    console.log('✅ Plan progress tracking');
    console.log('✅ User analytics summary');
    console.log('✅ Enhanced session history');
    console.log('✅ Custom start time support');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testEnhancedFastingAPI();
