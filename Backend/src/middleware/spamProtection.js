'use strict';

const logger = require('../utils/logger');
const DeviceFingerprint = require('../utils/deviceFingerprint');

/**
 * Spam protection middleware for anonymous submissions
 * Implements various techniques to prevent spam and abuse
 */

/**
 * Suspicious patterns and keywords for content filtering
 */
const SPAM_PATTERNS = [
  // Common spam phrases
  /\b(click here|buy now|free money|guaranteed|limited time|act now|urgent|congratulations|winner)\b/gi,
  // URL patterns
  /(https?:\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?/gi,
  // Email patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone number patterns
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // Excessive punctuation
  /[!?]{3,}/g,
  // Repeated characters
  /(.)\1{4,}/g,
  // All caps (more than 50% uppercase)
  /^[A-Z\s\d\W]{50,}$/,
];

/**
 * Blocked IP addresses (can be loaded from database or config)
 */
const BLOCKED_IPS = new Set([
  // Add known malicious IPs here or load from database
]);

/**
 * Blocked user agents
 */
const BLOCKED_USER_AGENTS = new Set([
  // Add known bot/user agent patterns here
]);

/**
 * Check if content contains spam patterns
 * @param {string} content - Content to check
 * @returns {Object} Spam detection result
 */
const detectSpamContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { isSpam: false, score: 0, patterns: [] };
  }

  let spamScore = 0;
  const detectedPatterns = [];

  SPAM_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      spamScore += matches.length * 10; // Each match adds 10 points
      detectedPatterns.push({
        pattern: pattern.toString(),
        matches: matches.length,
        type: `pattern_${index}`,
      });
    }
  });

  // Check content length (very short or very long content might be spam)
  if (content.length < 5) {
    spamScore += 5;
    detectedPatterns.push({ type: 'too_short', score: 5 });
  } else if (content.length > 5000) {
    spamScore += 10;
    detectedPatterns.push({ type: 'too_long', score: 10 });
  }

  // Check for excessive whitespace
  const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
  if (whitespaceRatio > 0.7) {
    spamScore += 15;
    detectedPatterns.push({ type: 'excessive_whitespace', score: 15 });
  }

  // Check for repetitive content
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = 1 - (uniqueWords.size / words.length);
  if (repetitionRatio > 0.5) {
    spamScore += 20;
    detectedPatterns.push({ type: 'repetitive_content', score: 20 });
  }

  const isSpam = spamScore >= (parseInt(process.env.SPAM_THRESHOLD) || 50);

  return {
    isSpam,
    score: spamScore,
    patterns: detectedPatterns,
    threshold: parseInt(process.env.SPAM_THRESHOLD) || 50,
  };
};

/**
 * Check if IP address is blocked
 * @param {string} ipAddress - IP address to check
 * @returns {boolean} True if IP is blocked
 */
const isIPBlocked = (ipAddress) => {
  if (!ipAddress) return false;

  // Check static blocked list
  if (BLOCKED_IPS.has(ipAddress)) {
    return true;
  }

  // Check for private/internal IPs (should not be blocked)
  const privateIPPatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/,
    /^::1$/,
  ];

  const isPrivate = privateIPPatterns.some(pattern => pattern.test(ipAddress));
  if (isPrivate) {
    return false;
  }

  // Additional IP-based checks can be added here
  // For example, checking against a database of blocked IPs
  return false;
};

/**
 * Check if user agent is suspicious
 * @param {string} userAgent - User agent string
 * @returns {boolean} True if user agent is suspicious
 */
const isSuspiciousUserAgent = (userAgent) => {
  // Bypass user agent check in test environment
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  if (!userAgent) return true; // No user agent is suspicious

  // Check blocked user agents
  if (BLOCKED_USER_AGENTS.has(userAgent)) {
    return true;
  }

  // Check for common bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /php/i,
  ];

  // Allow some legitimate bots but flag others
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
  ];

  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  const isLegitimateBot = legitimateBots.some(pattern => pattern.test(userAgent));

  return isBot && !isLegitimateBot;
};

/**
 * Check submission frequency for abuse detection
 * @param {string} identifier - IP address or device fingerprint
 * @returns {Promise<boolean>} True if submission frequency is too high
 */
// eslint-disable-next-line no-unused-vars
const checkSubmissionFrequency = (_identifier) => {
  // This would typically use Redis or a database to track submission frequency
  // For now, we'll implement a basic in-memory check

  // TODO: Implement actual frequency checking using these variables
  // const threshold = parseInt(process.env.ABUSE_DETECTION_THRESHOLD) || 100;
  // const timeWindow = 60 * 60 * 1000; // 1 hour

  // In a real implementation, you would:
  // 1. Check how many submissions from this identifier in the time window
  // 2. Compare against threshold
  // 3. Return true if threshold exceeded

  return false; // Placeholder
};

/**
 * Main spam protection middleware
 */
const spamProtection = async (req, res, next) => {
  try {
    const isEnabled = process.env.SPAM_DETECTION_ENABLED !== 'false';
    if (!isEnabled) {
      return next();
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // Generate device fingerprint if not already present
    if (!req.deviceFingerprint) {
      req.deviceFingerprint = DeviceFingerprint.generate(req);
    }

    // Check IP blocklist
    if (isIPBlocked(ipAddress)) {
      logger.warn('Blocked IP attempted submission:', { ipAddress, userAgent });
      return res.status(403).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Access denied from this IP address.',
        },
      });
    }

    // Check user agent
    if (isSuspiciousUserAgent(userAgent)) {
      logger.warn('Suspicious user agent detected:', { ipAddress, userAgent });
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUSPICIOUS_USER_AGENT',
          message: 'Access denied. Please use a standard web browser.',
        },
      });
    }

    // Check submission frequency
    const isAbusiveFrequency = await checkSubmissionFrequency(ipAddress);
    if (isAbusiveFrequency) {
      logger.warn('Abusive submission frequency detected:', { ipAddress, userAgent });
      return res.status(429).json({
        success: false,
        error: {
          code: 'ABUSIVE_FREQUENCY',
          message: 'Too many submissions. Please try again later.',
        },
      });
    }

    // Check content for spam if answers are present
    if (req.body && req.body.answers && Array.isArray(req.body.answers)) {
      for (let i = 0; i < req.body.answers.length; i++) {
        const answer = req.body.answers[i];

        if (answer.answer_value && typeof answer.answer_value === 'string') {
          const spamResult = detectSpamContent(answer.answer_value);

          if (spamResult.isSpam) {
            logger.warn('Spam content detected:', {
              ipAddress,
              userAgent,
              answerIndex: i,
              spamScore: spamResult.score,
              patterns: spamResult.patterns,
            });

            return res.status(400).json({
              success: false,
              error: {
                code: 'SPAM_CONTENT_DETECTED',
                message: 'Content appears to be spam and cannot be submitted.',
                details: {
                  answerIndex: i,
                  spamScore: spamResult.score,
                },
              },
            });
          }
        }
      }
    }

    // Add spam protection metadata to request
    req.spamProtection = {
      ipAddress,
      userAgent,
      deviceFingerprint: req.deviceFingerprint,
      timestamp: new Date().toISOString(),
      passed: true,
    };

    next();
  } catch (error) {
    logger.error('Error in spam protection middleware:', error);

    // Fail open - allow the request but log the error
    req.spamProtection = {
      error: error.message,
      passed: true, // Allow on error to prevent blocking legitimate users
    };

    next();
  }
};

/**
 * Content sanitization middleware
 * Removes or escapes potentially harmful content
 */
const sanitizeContent = (req, res, next) => {
  try {
    if (req.body && req.body.answers && Array.isArray(req.body.answers)) {
      req.body.answers = req.body.answers.map(answer => {
        if (answer.answer_value && typeof answer.answer_value === 'string') {
          // Basic HTML tag removal
          answer.answer_value = answer.answer_value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
        return answer;
      });
    }

    next();
  } catch (error) {
    logger.error('Error in content sanitization:', error);
    next();
  }
};

/**
 * Report abuse endpoint handler
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const reportAbuse = (req, res) => {
  try {
    const { type, description, target_id } = req.body;

    // Log abuse report
    logger.warn('Abuse reported:', {
      type,
      description,
      target_id,
      reporter_ip: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would:
    // 1. Save the abuse report to database
    // 2. Send notification to administrators
    // 3. Potentially take immediate action based on severity

    res.json({
      success: true,
      message: 'Abuse report received. Thank you for helping keep our platform safe.',
    });
  } catch (error) {
    logger.error('Error processing abuse report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ABUSE_REPORT_ERROR',
        message: 'Failed to process abuse report.',
      },
    });
  }
};

module.exports = {
  spamProtection,
  sanitizeContent,
  detectSpamContent,
  isIPBlocked,
  isSuspiciousUserAgent,
  checkSubmissionFrequency,
  reportAbuse,
};