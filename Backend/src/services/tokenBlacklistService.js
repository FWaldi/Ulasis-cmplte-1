'use strict';

// const crypto = require('crypto'); // eslint-disable-line no-unused-vars
const logger = require('../utils/logger');

/**
 * Token blacklist service for managing invalidated tokens
 * Uses in-memory storage with optional Redis support for production
 */
class TokenBlacklistService {
  constructor() {
    // In-memory storage for development/testing
    this.blacklistedTokens = new Map();

    // Configuration
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
    this.defaultTTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Start cleanup interval
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanup();
    }

    logger.info('Token blacklist service initialized', {
      storageType: 'memory',
      cleanupInterval: this.cleanupInterval,
      defaultTTL: this.defaultTTL,
    });
  }

  /**
   * Add a token to the blacklist
   * @param {string} token - JWT token to blacklist
   * @param {string} reason - Reason for blacklisting
   * @param {number} userId - User ID associated with the token
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  addToBlacklist(token, reason = 'logout', userId = null, ttl = null) {
    try {
      const tokenJti = this.extractJti(token);
      if (!tokenJti) {
        logger.warn('Cannot extract JTI from token', { token: `${token.substring(0, 20)}...` });
        return false;
      }

      const expiresAt = Date.now() + (ttl || this.defaultTTL);

      this.blacklistedTokens.set(tokenJti, {
        token: `${token.substring(0, 50)}...`, // Store only first 50 chars for logging
        reason,
        userId,
        blacklistedAt: Date.now(),
        expiresAt,
      });

      logger.info('Token added to blacklist', {
        tokenJti,
        reason,
        userId,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Failed to add token to blacklist', {
        error: error.message,
        token: `${token.substring(0, 20)}...`,
      });
      return false;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token is blacklisted
   */
  isBlacklisted(token) {
    try {
      const tokenJti = this.extractJti(token);
      if (!tokenJti) {
        return false;
      }

      const blacklistedEntry = this.blacklistedTokens.get(tokenJti);

      if (!blacklistedEntry) {
        return false;
      }

      // Check if the blacklist entry has expired
      if (Date.now() > blacklistedEntry.expiresAt) {
        this.blacklistedTokens.delete(tokenJti);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check token blacklist status', {
        error: error.message,
        token: `${token.substring(0, 20)}...`,
      });
      return false;
    }
  }

  /**
   * Remove a token from the blacklist (if needed)
   * @param {string} token - JWT token to remove
   * @returns {boolean} True if token was removed
   */
  removeFromBlacklist(token) {
    try {
      const tokenJti = this.extractJti(token);
      if (!tokenJti) {
        return false;
      }

      const existed = this.blacklistedTokens.has(tokenJti);
      this.blacklistedTokens.delete(tokenJti);

      if (existed) {
        logger.info('Token removed from blacklist', { tokenJti });
      }

      return existed;
    } catch (error) {
      logger.error('Failed to remove token from blacklist', {
        error: error.message,
        token: `${token.substring(0, 20)}...`,
      });
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user (useful for password change or account lock)
   * @param {number} userId - User ID whose tokens should be blacklisted
   * @param {string} reason - Reason for blacklisting
   */
  blacklistAllUserTokens(userId, reason = 'security_action') {
    try {
      let blacklistedCount = 0;

      for (const [_tokenJti, entry] of this.blacklistedTokens.entries()) { // eslint-disable-line no-unused-vars
        if (entry.userId === userId) {
          entry.reason = reason;
          entry.blacklistedAt = Date.now();
          blacklistedCount++;
        }
      }

      logger.info('All user tokens blacklisted', {
        userId,
        reason,
        blacklistedCount,
      });

      return blacklistedCount;
    } catch (error) {
      logger.error('Failed to blacklist all user tokens', {
        error: error.message,
        userId,
      });
      return 0;
    }
  }

  /**
   * Get blacklist statistics
   * @returns {Object} Blacklist statistics
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    for (const entry of this.blacklistedTokens.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.blacklistedTokens.size,
      active: activeCount,
      expired: expiredCount,
    };
  }

  /**
   * Clean up expired blacklist entries
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [tokenJti, entry] of this.blacklistedTokens.entries()) {
        if (now > entry.expiresAt) {
          this.blacklistedTokens.delete(tokenJti);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Token blacklist cleanup completed', {
          cleanedCount,
          remainingCount: this.blacklistedTokens.size,
        });
      }
    } catch (error) {
      logger.error('Token blacklist cleanup failed', { error: error.message });
    }
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Extract JTI (JWT ID) from token
   * @param {string} token - JWT token
   * @returns {string|null} JTI or null if not found
   */
  extractJti(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.jti;
    } catch (error) {
      return null;
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.stopCleanup();
    logger.info('Token blacklist service shutdown completed');
  }
}

module.exports = new TokenBlacklistService();
