'use strict';

const crypto = require('crypto');

/**
 * Device fingerprinting utility for enhanced security
 * Generates fingerprints based on various request attributes
 */
class DeviceFingerprint {
  /**
   * Generate device fingerprint from request
   * @param {Object} req - Express request object
   * @returns {string} Device fingerprint hash
   */
  static generate(req) {
    try {
      const fingerprintData = {
        userAgent: req.get('User-Agent') || '',
        acceptLanguage: req.get('Accept-Language') || '',
        acceptEncoding: req.get('Accept-Encoding') || '',
        ip: this.getClientIP(req),
        // Add more factors as needed
        timezone: req.get('Timezone') || '',
        platform: req.get('Sec-CH-UA-Platform') || '',
        mobile: req.get('Sec-CH-UA-Mobile') || '',
      };

      // Create a normalized string from the data
      const normalizedString = Object.values(fingerprintData)
        .map((value) => (value || '').toLowerCase().trim())
        .join('|');

      // Generate SHA-256 hash
      return crypto.createHash('sha256').update(normalizedString).digest('hex');
    } catch (error) {
      // Fallback to simple IP-based fingerprint if error occurs
      return crypto.createHash('sha256').update(this.getClientIP(req)).digest('hex');
    }
  }

  /**
   * Extract client IP from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  static getClientIP(req) {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.headers['x-client-ip'] ||
      '127.0.0.1'
    );
  }

  /**
   * Check if fingerprint is suspicious (too many changes)
   * @param {string} currentFingerprint - Current device fingerprint
   * @param {string} storedFingerprint - Previously stored fingerprint
   * @returns {Object} Suspicion analysis
   */
  static analyzeSuspicion(currentFingerprint, storedFingerprint) {
    if (!storedFingerprint) {
      return {
        isSuspicious: false,
        reason: 'no_previous_fingerprint',
        confidence: 0,
      };
    }

    const isExactMatch = currentFingerprint === storedFingerprint;

    if (isExactMatch) {
      return {
        isSuspicious: false,
        reason: 'exact_match',
        confidence: 0,
      };
    }

    // For now, any mismatch is considered suspicious
    // In a real implementation, you might want more sophisticated analysis
    return {
      isSuspicious: true,
      reason: 'fingerprint_mismatch',
      confidence: 0.7, // Medium confidence
      details: {
        current: `${currentFingerprint.substring(0, 16)}...`,
        stored: `${storedFingerprint.substring(0, 16)}...`,
      },
    };
  }

  /**
   * Extract user agent information
   * @param {string} userAgent - User agent string
   * @returns {Object} Parsed user agent info
   */
  static parseUserAgent(userAgent = '') {
    const ua = userAgent.toLowerCase();

    const browser = this.detectBrowser(ua);
    const os = this.detectOS(ua);
    const device = this.detectDevice(ua);

    return {
      raw: userAgent,
      browser,
      os,
      device,
      isBot: this.isBot(ua),
    };
  }

  /**
   * Detect browser from user agent
   * @param {string} ua - User agent string (lowercase)
   * @returns {string} Browser name
   */
  static detectBrowser(ua) {
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
    if (ua.includes('msie') || ua.includes('trident')) return 'Internet Explorer';
    return 'Unknown';
  }

  /**
   * Detect operating system from user agent
   * @param {string} ua - User agent string (lowercase)
   * @returns {string} Operating system name
   */
  static detectOS(ua) {
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac os') || ua.includes('macos')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Detect device type from user agent
   * @param {string} ua - User agent string (lowercase)
   * @returns {string} Device type
   */
  static detectDevice(ua) {
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  /**
   * Check if user agent appears to be a bot
   * @param {string} ua - User agent string (lowercase)
   * @returns {boolean} True if likely a bot
   */
  static isBot(ua) {
    const botPatterns = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python',
      'java',
      'node',
      'axios',
      'fetch',
      'http',
    ];

    return botPatterns.some((pattern) => ua.includes(pattern));
  }

  /**
   * Generate a session ID that includes device fingerprint
   * @param {string} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @returns {string} Session ID
   */
  static generateSessionId(userId, deviceFingerprint) {
    const sessionData = `${userId}:${deviceFingerprint}:${Date.now()}`;
    return crypto.createHash('sha256').update(sessionData).digest('hex');
  }
}

module.exports = DeviceFingerprint;
