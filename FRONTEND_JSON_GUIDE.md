# 🔧 Frontend JSON Parsing Error Solutions

## The Error You're Seeing
```
Error: SyntaxError: Unexpected token '"', ""{\"exerci"... is not valid JSON
```

This error typically occurs when JSON data is being double-encoded or incorrectly formatted.

## 🎯 Common Causes & Solutions

### 1. **Double JSON.stringify() (Most Common)**
**Problem:** Your frontend is calling `JSON.stringify()` twice.

**❌ Wrong:**
```javascript
const data = { exercise_type: 'running' };
const jsonData = JSON.stringify(JSON.stringify(data)); // Double stringify!
fetch('/api/exercise/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: jsonData
});
```

**✅ Correct:**
```javascript
const data = { exercise_type: 'running' };
fetch('/api/exercise/start', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data) // Single stringify
});
```

### 2. **React Native Fetch Issues**
**Problem:** React Native sometimes handles JSON differently.

**✅ React Native Solution:**
```javascript
const startExercise = async (exerciseType) => {
  try {
    const response = await fetch('http://localhost:5000/api/exercise/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        exercise_type: exerciseType
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Exercise start error:', error);
    throw error;
  }
};
```

### 3. **Axios Configuration Issues**
**Problem:** Axios might be double-encoding JSON.

**✅ Axios Solution:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken(); // Your token getter
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const startExercise = async (exerciseType) => {
  try {
    const response = await api.post('/exercise/start', {
      exercise_type: exerciseType
    });
    return response.data;
  } catch (error) {
    console.error('Exercise start error:', error.response?.data || error.message);
    throw error;
  }
};
```

### 4. **FormData vs JSON Confusion**
**Problem:** Using FormData instead of JSON.

**❌ Wrong:**
```javascript
const formData = new FormData();
formData.append('exercise_type', 'running');
fetch('/api/exercise/start', {
  method: 'POST',
  body: formData // This won't work with JSON endpoints
});
```

**✅ Correct:**
```javascript
fetch('/api/exercise/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ exercise_type: 'running' })
});
```

## 🛠️ Debugging Steps

### 1. **Check Your Request Body**
Add logging to see what you're actually sending:

```javascript
const data = { exercise_type: 'running' };
const jsonString = JSON.stringify(data);
console.log('Sending JSON:', jsonString);
console.log('JSON type:', typeof jsonString);

fetch('/api/exercise/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: jsonString
});
```

### 2. **Verify Content-Type Header**
Make sure you're setting the correct header:

```javascript
headers: {
  'Content-Type': 'application/json', // This is crucial!
  'Authorization': `Bearer ${token}`
}
```

### 3. **Test with curl**
Test your endpoint directly with curl to verify it works:

```bash
curl -X POST "http://localhost:5000/api/exercise/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"exercise_type": "running"}'
```

## 🎯 Complete Working Example

Here's a complete working example for React Native:

```javascript
// ExerciseService.js
class ExerciseService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async startExercise(exerciseType) {
    return this.makeRequest('/exercise/start', 'POST', {
      exercise_type: exerciseType
    });
  }

  async stopExercise(sessionId, endReason = 'completed') {
    return this.makeRequest(`/exercise/stop/${sessionId}`, 'PUT', {
      end_reason: endReason
    });
  }

  async getCurrentExercise() {
    return this.makeRequest('/exercise/current');
  }

  async getExerciseSessions(page = 1, limit = 20) {
    return this.makeRequest(`/exercise/sessions?page=${page}&limit=${limit}`);
  }

  async getExerciseAnalytics() {
    return this.makeRequest('/exercise/analytics/summary');
  }
}

// Usage
const exerciseService = new ExerciseService('http://localhost:5000/api', userToken);

// Start exercise
const session = await exerciseService.startExercise('running');
console.log('Exercise started:', session);

// Stop exercise
const stoppedSession = await exerciseService.stopExercise(session.session.id);
console.log('Exercise stopped:', stoppedSession);
```

## 🚨 Backend Error Handling

Your backend now has enhanced error handling that will:

1. **Log detailed error information** to help debug issues
2. **Attempt to fix common JSON problems** automatically
3. **Return helpful error messages** to the frontend

The backend will log errors like this:
```
❌ JSON Parse Error: {
  error: "Unexpected token...",
  body: "{\"exercise_type\":\"running\"}",
  url: "/exercise/start",
  method: "POST",
  contentType: "application/json"
}
```

## ✅ Quick Checklist

- [ ] Use `JSON.stringify()` only once
- [ ] Set `Content-Type: application/json` header
- [ ] Include `Authorization: Bearer {token}` header
- [ ] Don't use FormData for JSON endpoints
- [ ] Test with curl first
- [ ] Check browser network tab for actual request body
- [ ] Verify your token is valid

## 🆘 Still Having Issues?

If you're still getting JSON parsing errors:

1. **Check the browser Network tab** to see the exact request being sent
2. **Copy the request as curl** and test it directly
3. **Check the backend logs** for detailed error information
4. **Verify your token** is valid and not expired

The backend now provides much better error logging to help identify the exact issue!
