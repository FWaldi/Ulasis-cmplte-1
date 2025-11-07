'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate test JWT token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateTestToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
  };

  // Use a token that includes the user ID for testing
  return `test-access-token-${user.id}`;
};

/**
 * Generate expired test token
 * @param {Object} user - User object
 * @returns {string} Expired JWT token
 */
const generateExpiredToken = (user) => {
  // Return a token that will be identified as expired in the mock
  return 'expired-token';
};

/**
 * Generate invalid token
 * @returns {string} Invalid JWT token
 */
const generateInvalidToken = () => {
  // Return a token that will be identified as invalid in the mock
  return 'invalid-token';
};

/**
 * Get authorization header with Bearer token
 * @param {string} token - JWT token
 * @returns {string} Authorization header value
 */
const getAuthHeader = (token) => {
  return `Bearer ${token}`;
};

module.exports = {
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  getAuthHeader,
};