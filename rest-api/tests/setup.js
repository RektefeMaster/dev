// Jest test setup file
const dotenv = require('dotenv');

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rektefe_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = '3001';

// Global test timeout
jest.setTimeout(30000);
