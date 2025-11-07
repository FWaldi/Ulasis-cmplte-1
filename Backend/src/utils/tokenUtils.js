'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tokenBlacklistService = require('../services/tokenBlacklistService');
const logger = require('./logger');

/**
 * Token utilities for JWT generation and verification
 */
class TokenUtils {
  constructor() {
    // Use the same secret for both access and refresh tokens for simplicity
    this.accessTokenSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.refreshTokenSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.issuer = process.env.JWT_ISSUER || 'ulasis-api';
    this.audience = process.env.JWT_AUDIENCE || 'ulasis-client';

    // Validate secrets in production
    if (process.env.NODE_ENV === 'production') {
      if (!this.accessTokenSecret || this.accessTokenSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
    }

    // Use secure defaults for development, but warn
    if (!this.accessTokenSecret) {
      logger.warn(
        'WARNING: Using default JWT_SECRET. Set JWT_SECRET in your environment variables.',
      );
      this.accessTokenSecret = 'your-super-secret-jwt-key-change-in-production';
    }
  }

  /**
   * Generate access token for user
   * @param {Object} user - User object
   * @returns {string} JWT access token
   */
  generateAccessToken(user) {
    logger.info('DEBUG: generateAccessToken called with user', { userId: user.id, email: user.email });
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    logger.info('DEBUG: AccessToken payload being signed', { payload });
    const token = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });

    const decoded = jwt.decode(token);
    logger.info('DEBUG: Generated accessToken', { decoded });
    return token;
  }

  /**
   * Generate refresh token for user
   * @param {Object} user - User object
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // Unique identifier for token
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate token pair (access and refresh)
   * @param {Object} user - User object
   * @returns {Object} Object containing access and refresh tokens
   */
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: this.getExpirationTime(this.accessTokenExpiry),
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT access token
   * @returns {Object} Decoded token payload
   */
  async verifyAccessToken(token) {
    try {
      // Check if token is blacklisted first
      const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} Decoded token payload
   */
  async verifyRefreshToken(token) {
    try {
      // Check if token is blacklisted first
      const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Get expiration time in seconds from human readable format
   * @param {string} expiry - Expiry string (e.g., '15m', '7d')
   * @returns {number} Expiration time in seconds
   */
  getExpirationTime(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // Default 15 minutes
    }
  }

  /**
   * Check if token is expired
   * @param {Object} decodedToken - Decoded JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(decodedToken) {
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  }

  /**
   * Generate secure random token for email verification or password reset
   * @returns {string} Secure random token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Token string or null if invalid
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get token payload without verification
   * @param {string} token - JWT token
   * @returns {Object|null} Token payload or null if invalid
   */
  getTokenPayload(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? decoded.payload : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Blacklist a token
   * @param {string} token - JWT token to blacklist
   * @param {string} reason - Reason for blacklisting
   * @param {number} userId - User ID associated with the token
   * @returns {boolean} True if token was blacklisted
   */
  blacklistToken(token, reason = 'logout', userId = null) {
    return tokenBlacklistService.addToBlacklist(token, reason, userId);
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token is blacklisted
   */
  isTokenBlacklisted(token) {
    return tokenBlacklistService.isBlacklisted(token);
  }

  /**
   * Blacklist all tokens for a user
   * @param {number} userId - User ID whose tokens should be blacklisted
   * @param {string} reason - Reason for blacklisting
   * @returns {number} Number of tokens blacklisted
   */
  blacklistAllUserTokens(userId, reason = 'security_action') {
    return tokenBlacklistService.blacklistAllUserTokens(userId, reason);
  }
}

module.exports = new TokenUtils();
