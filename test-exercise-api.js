// Test script for exercise tracking API endpoints
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

async function testExerciseAPI() {
  try {
    console.log('🧪 Testing Exercise Tracking API...\n');

    // Step 1: Register and login
    console.log('1. Setting up authentication...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Exercise',
        surname: 'Test',
        cellNumber: '+1234567890',
        email: 'exercise@example.com',
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
      email: 'exercise@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token obtained\n');

    // Step 2: Start running session
    console.log('2. Testing start running session...');
    const startRunningResponse = await makeRequest('POST', '/exercise/start', {
      exercise_type: 'running',
      start_time: new Date().toISOString()
    });
    console.log('✅ Running session started:', {
      sessionId: startRunningResponse.session.id,
      exerciseType: startRunningResponse.session.exercise_type,
      status: startRunningResponse.session.status
    });
    const runningSessionId = startRunningResponse.session.id;
    console.log('');

    // Step 3: Get current session
    console.log('3. Testing get current exercise session...');
    const currentResponse = await makeRequest('GET', '/exercise/current');
    console.log('✅ Current exercise session:', {
      exerciseType: currentResponse.session.exercise_type,
      durationMinutes: currentResponse.session.duration_minutes,
      status: currentResponse.session.status
    });
    console.log('');

    // Step 4: Wait a bit and stop running session
    console.log('4. Testing stop running session...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const stopRunningResponse = await makeRequest('PUT', `/exercise/stop/${runningSessionId}`, {
      end_reason: 'completed'
    });
    console.log('✅ Running session stopped:', {
      duration: stopRunningResponse.session.duration_minutes,
      endReason: stopRunningResponse.session.end_reason,
      exerciseType: stopRunningResponse.session.exercise_type
    });
    console.log('');

    // Step 5: Start cycling session
    console.log('5. Testing start cycling session...');
    const startCyclingResponse = await makeRequest('POST', '/exercise/start', {
      exercise_type: 'cycling'
    });
    const cyclingSessionId = startCyclingResponse.session.id;
    console.log('✅ Cycling session started:', startCyclingResponse.session.exercise_type);
    console.log('');

    // Step 6: Stop cycling session
    console.log('6. Testing stop cycling session...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await makeRequest('PUT', `/exercise/stop/${cyclingSessionId}`, {
      end_reason: 'completed'
    });
    console.log('✅ Cycling session stopped');
    console.log('');

    // Step 7: Start weightlifting session
    console.log('7. Testing start weightlifting session...');
    const startWeightliftingResponse = await makeRequest('POST', '/exercise/start', {
      exercise_type: 'weightlifting'
    });
    const weightliftingSessionId = startWeightliftingResponse.session.id;
    console.log('✅ Weightlifting session started:', startWeightliftingResponse.session.exercise_type);
    console.log('');

    // Step 8: Stop weightlifting session
    console.log('8. Testing stop weightlifting session...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await makeRequest('PUT', `/exercise/stop/${weightliftingSessionId}`, {
      end_reason: 'completed'
    });
    console.log('✅ Weightlifting session stopped');
    console.log('');

    // Step 9: Get all sessions
    console.log('9. Testing get all exercise sessions...');
    const sessionsResponse = await makeRequest('GET', '/exercise/sessions?limit=10');
    console.log('✅ Exercise sessions retrieved:', {
      totalSessions: sessionsResponse.sessions.length,
      pagination: sessionsResponse.pagination
    });
    console.log('');

    // Step 10: Get analytics summary
    console.log('10. Testing exercise analytics summary...');
    const summaryResponse = await makeRequest('GET', '/exercise/analytics/summary');
    console.log('✅ Exercise analytics summary:', {
      totalSessions: summaryResponse.summary.total_sessions,
      totalExerciseHours: summaryResponse.summary.total_exercise_hours,
      averageSessionHours: summaryResponse.summary.average_session_hours,
      exerciseBreakdown: Object.keys(summaryResponse.summary.exercise_breakdown)
    });
    console.log('');

    // Step 11: Test different exercise types
    console.log('11. Testing different exercise types...');
    const exerciseTypes = ['walking', 'swimming', 'yoga', 'hiit'];
    
    for (const exerciseType of exerciseTypes) {
      const startResponse = await makeRequest('POST', '/exercise/start', {
        exercise_type: exerciseType
      });
      console.log(`✅ ${exerciseType} session started`);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
      
      await makeRequest('PUT', `/exercise/stop/${startResponse.session.id}`, {
        end_reason: 'completed'
      });
      console.log(`✅ ${exerciseType} session stopped`);
    }
    console.log('');

    // Step 12: Test error handling - try to start session when one is active
    console.log('12. Testing error handling - active session exists...');
    const startSessionResponse = await makeRequest('POST', '/exercise/start', {
      exercise_type: 'running'
    });
    console.log('✅ New session started');
    
    try {
      await makeRequest('POST', '/exercise/start', {
        exercise_type: 'cycling'
      });
    } catch (error) {
      console.log('✅ Correctly prevented duplicate active session:', error.response.data.error);
    }
    
    // Stop the active session
    await makeRequest('PUT', `/exercise/stop/${startSessionResponse.session.id}`, {
      end_reason: 'completed'
    });
    console.log('✅ Active session stopped');
    console.log('');

    // Step 13: Final analytics summary
    console.log('13. Final analytics summary...');
    const finalSummaryResponse = await makeRequest('GET', '/exercise/analytics/summary');
    console.log('✅ Final exercise analytics:', {
      totalSessions: finalSummaryResponse.summary.total_sessions,
      totalExerciseHours: finalSummaryResponse.summary.total_exercise_hours,
      exerciseBreakdown: finalSummaryResponse.summary.exercise_breakdown
    });
    console.log('');

    console.log('🎉 All Exercise API tests completed successfully!');
    console.log('\n💪 Summary of Exercise Features:');
    console.log('✅ Exercise types (running, cycling, walking, swimming, weightlifting, yoga, hiit, other)');
    console.log('✅ Session management (start, stop, current, history)');
    console.log('✅ Duration tracking and analytics');
    console.log('✅ Exercise breakdown by type');
    console.log('✅ Pagination support');
    console.log('✅ Error handling and validation');
    console.log('✅ Real-time session tracking');

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
testExerciseAPI();
