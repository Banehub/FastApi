# Express API with MongoDB Authentication

A simple Express.js API with user authentication using MongoDB. This API provides register and login endpoints with secure password hashing and JWT tokens.

## Features

- ✅ User registration with validation
- ✅ User login with JWT authentication
- ✅ Password hashing with bcrypt
- ✅ MongoDB integration with separate user collections
- ✅ Input validation and error handling
- ✅ CORS support
- ✅ Request logging

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if the API is running

### Authentication
- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/profile` - Get user profile (requires token)

## API Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get user profile
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "user": {
      "id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Validation errors if any"]
}
```

## Database Structure

The API creates a `users` collection in MongoDB with the following structure:
- Each user has their own document with all personal information
- Passwords are hashed using bcrypt
- User data includes: username, email, password, personal info, address, etc.

## Environment Variables

Create a `.env` file in the root directory:
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

## Testing

Run the test script to verify all endpoints:
```bash
node test-api.js
```

## Security Features

- Password hashing with bcrypt (salt rounds: 12)
- JWT tokens for authentication
- Input validation and sanitization
- CORS protection
- Error handling without sensitive data exposure

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **express-validator**: Input validation
- **nodemon**: Development server (dev dependency)
