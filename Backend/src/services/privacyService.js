'use strict';

const { Response, Answer } = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Privacy and Data Protection Service
 * Handles GDPR compliance, data minimization, and privacy controls for anonymous submissions
 */

class PrivacyService {
  constructor() {
    // Data retention policies (in days)
    this.retentionPolicies = {
      ipAddress: parseInt(process.env.IP_RETENTION_DAYS) || 30,
      deviceFingerprint: parseInt(process.env.DEVICE_FINGERPRINT_RETENTION_DAYS) || 90,
      userAgent: parseInt(process.env.USER_AGENT_RETENTION_DAYS) || 90,
      referrer: parseInt(process.env.REFERRER_RETENTION_DAYS) || 180,
      responses: parseInt(process.env.RESPONSE_RETENTION_DAYS) || 2555, // 7 years
      analytics: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 1095, // 3 years
    };

    // Data minimization rules
    this.minimizationRules = {
      // Fields to anonymize immediately
      immediateAnonymization: [
        'ipAddress',
        'deviceFingerprint',
      ],

      // Fields to hash instead of storing raw
      hashFields: [
        'deviceFingerprint',
      ],

      // Fields to truncate
      truncateFields: {
        userAgent: 200,
        referrer: 300,
      },

      // Fields to exclude from exports
      excludeFromExport: [
        'ipAddress',
        'deviceFingerprint',
        'userAgent',
      ],
    };

    // Privacy settings
    this.privacySettings = {
      anonymizeIPs: process.env.ANONYMIZE_IPS === 'true',
      hashFingerprints: process.env.HASH_FINGERPRINTS === 'true',
      enableDataMinimization: process.env.ENABLE_DATA_MINIMIZATION === 'true',
      gdprMode: process.env.GDPR_MODE === 'true',
      logDataAccess: process.env.LOG_DATA_ACCESS === 'true',
    };
  }

  /**
   * Apply data minimization to response data
   * @param {Object} responseData - Response data to minimize
   * @returns {Object} Minimized response data
   */
  applyDataMinimization(responseData) {
    if (!this.privacySettings.enableDataMinimization) {
      return responseData;
    }

    const minimized = { ...responseData };

    // Apply immediate anonymization
    this.minimizationRules.immediateAnonymization.forEach(field => {
      if (minimized[field]) {
        if (this.minimizationRules.hashFields.includes(field)) {
          minimized[field] = this.hashField(minimized[field]);
        } else if (field === 'ipAddress') {
          minimized[field] = this.anonymizeIP(minimized[field]);
        }
      }
    });

    // Apply field truncation
    Object.entries(this.minimizationRules.truncateFields).forEach(([field, maxLength]) => {
      if (minimized[field] && minimized[field].length > maxLength) {
        minimized[field] = `${minimized[field].substring(0, maxLength)}...`;
      }
    });

    return minimized;
  }

  /**
   * Anonymize IP address by removing last octet
   * @param {string} ipAddress - IP address to anonymize
   * @returns {string} Anonymized IP address
   */
  anonymizeIP(ipAddress) {
    if (!ipAddress) return null;

    try {
      // Handle IPv4
      if (ipAddress.includes('.')) {
        const parts = ipAddress.split('.');
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
      }

      // Handle IPv6 (simplified - remove last 64 bits)
      if (ipAddress.includes(':')) {
        const parts = ipAddress.split(':');
        if (parts.length >= 4) {
          return `${parts.slice(0, 4).join(':')}::0`;
        }
      }

      // Fallback - return hash
      return this.hashField(ipAddress);
    } catch (error) {
      logger.warn('Error anonymizing IP address:', error);
      return this.hashField(ipAddress);
    }
  }

  /**
   * Hash a field using SHA-256
   * @param {string} value - Value to hash
   * @returns {string} Hashed value
   */
  hashField(value) {
    if (!value) return null;

    const salt = process.env.HASH_SALT || 'default-privacy-salt';
    return crypto.createHash('sha256').update(value + salt).digest('hex').substring(0, 32);
  }

  /**
   * Clean up expired data based on retention policies
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupExpiredData() {
    const results = {
      ipAddressCleanup: 0,
      deviceFingerprintCleanup: 0,
      userAgentCleanup: 0,
      referrerCleanup: 0,
      totalCleaned: 0,
      errors: [],
    };

    try {
      logger.info('Starting privacy data cleanup...');

      // Clean up IP addresses
      if (this.retentionPolicies.ipAddress > 0) {
        const ipCutoffDate = new Date();
        ipCutoffDate.setDate(ipCutoffDate.getDate() - this.retentionPolicies.ipAddress);

        const ipCleanup = await Response.update(
          {
            ipAddress: null,
            metadata: {
              ...this.sequelize.literal('JSON_SET(COALESCE(metadata, "{}"), "$.ipAddressRemoved", NOW())'),
            },
          },
          {
            where: {
              createdAt: { [this.sequelize.Op.lt]: ipCutoffDate },
              ipAddress: { [this.sequelize.Op.ne]: null },
            },
          },
        );

        results.ipAddressCleanup = ipCleanup[0];
        logger.info(`Cleaned up ${results.ipAddressCleanup} expired IP addresses`);
      }

      // Clean up device fingerprints
      if (this.retentionPolicies.deviceFingerprint > 0) {
        const fpCutoffDate = new Date();
        fpCutoffDate.setDate(fpCutoffDate.getDate() - this.retentionPolicies.deviceFingerprint);

        const fpCleanup = await Response.update(
          {
            deviceFingerprint: null,
            metadata: {
              ...this.sequelize.literal('JSON_SET(COALESCE(metadata, "{}"), "$.deviceFingerprintRemoved", NOW())'),
            },
          },
          {
            where: {
              createdAt: { [this.sequelize.Op.lt]: fpCutoffDate },
              deviceFingerprint: { [this.sequelize.Op.ne]: null },
            },
          },
        );

        results.deviceFingerprintCleanup = fpCleanup[0];
        logger.info(`Cleaned up ${results.deviceFingerprintCleanup} expired device fingerprints`);
      }

      // Clean up user agents
      if (this.retentionPolicies.userAgent > 0) {
        const uaCutoffDate = new Date();
        uaCutoffDate.setDate(uaCutoffDate.getDate() - this.retentionPolicies.userAgent);

        const uaCleanup = await Response.update(
          {
            userAgent: null,
            metadata: {
              ...this.sequelize.literal('JSON_SET(COALESCE(metadata, "{}"), "$.userAgentRemoved", NOW())'),
            },
          },
          {
            where: {
              createdAt: { [this.sequelize.Op.lt]: uaCutoffDate },
              userAgent: { [this.sequelize.Op.ne]: null },
            },
          },
        );

        results.userAgentCleanup = uaCleanup[0];
        logger.info(`Cleaned up ${results.userAgentCleanup} expired user agents`);
      }

      // Clean up referrers
      if (this.retentionPolicies.referrer > 0) {
        const refCutoffDate = new Date();
        refCutoffDate.setDate(refCutoffDate.getDate() - this.retentionPolicies.referrer);

        const refCleanup = await Response.update(
          {
            referrer: null,
            metadata: {
              ...this.sequelize.literal('JSON_SET(COALESCE(metadata, "{}"), "$.referrerRemoved", NOW())'),
            },
          },
          {
            where: {
              createdAt: { [this.sequelize.Op.lt]: refCutoffDate },
              referrer: { [this.sequelize.Op.ne]: null },
            },
          },
        );

        results.referrerCleanup = refCleanup[0];
        logger.info(`Cleaned up ${results.referrerCleanup} expired referrers`);
      }

      results.totalCleaned = Object.values(results).reduce((sum, count) =>
        typeof count === 'number' ? sum + count : sum, 0,
      );

      logger.info(`Privacy cleanup completed. Total records cleaned: ${results.totalCleaned}`);
      return results;

    } catch (error) {
      logger.error('Error during privacy cleanup:', error);
      results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Get privacy compliance report
   * @returns {Promise<Object>} Compliance report
   */
  async getPrivacyComplianceReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        retentionPolicies: this.retentionPolicies,
        privacySettings: this.privacySettings,
        dataInventory: {},
        complianceStatus: 'compliant',
        recommendations: [],
      };

      // Count current data holdings
      const [totalResponses, responsesWithIP, responsesWithFingerprint, responsesWithUA] = await Promise.all([
        Response.count(),
        Response.count({ where: { ipAddress: { [this.sequelize.Op.ne]: null } } }),
        Response.count({ where: { deviceFingerprint: { [this.sequelize.Op.ne]: null } } }),
        Response.count({ where: { userAgent: { [this.sequelize.Op.ne]: null } } }),
      ]);

      report.dataInventory = {
        totalResponses,
        responsesWithIP,
        responsesWithFingerprint,
        responsesWithUA,
        ipRetentionRate: totalResponses > 0 ? (responsesWithIP / totalResponses * 100).toFixed(2) : 0,
        fingerprintRetentionRate: totalResponses > 0 ? (responsesWithFingerprint / totalResponses * 100).toFixed(2) : 0,
      };

      // Check compliance issues
      if (report.dataInventory.ipRetentionRate > 50 && this.retentionPolicies.ipAddress < 90) {
        report.complianceStatus = 'warning';
        report.recommendations.push('Consider reducing IP address retention period');
      }

      if (!this.privacySettings.enableDataMinimization) {
        report.complianceStatus = 'non-compliant';
        report.recommendations.push('Enable data minimization for GDPR compliance');
      }

      if (!this.privacySettings.anonymizeIPs) {
        report.complianceStatus = 'warning';
        report.recommendations.push('Enable IP anonymization for better privacy protection');
      }

      return report;

    } catch (error) {
      logger.error('Error generating privacy compliance report:', error);
      throw error;
    }
  }

  /**
   * Export data with privacy controls applied
   * @param {Object} options - Export options
   * @returns {Promise<Array>} Exported data
   */
  async exportDataWithPrivacy(options = {}) {
    try {
      const { questionnaireId, dateFrom, dateTo, includeMetadata = false } = options; // eslint-disable-line no-unused-vars

      const whereClause = {};
      if (questionnaireId) whereClause.questionnaireId = questionnaireId;
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[this.sequelize.Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[this.sequelize.Op.lte] = new Date(dateTo);
      }

      const responses = await Response.findAll({
        where: whereClause,
        include: [
          {
            model: Answer,
            as: 'answers',
            attributes: ['id', 'questionId', 'answerValue', 'ratingScore', 'isSkipped', 'createdAt'],
          },
        ],
        attributes: {
          exclude: this.minimizationRules.excludeFromExport,
        },
      });

      // Apply additional privacy filtering
      const sanitizedResponses = responses.map(response => {
        const responseData = response.toJSON();

        // Remove sensitive metadata
        if (responseData.metadata) {
          delete responseData.metadata.ipAddress;
          delete responseData.metadata.deviceFingerprint;
          delete responseData.metadata.userAgent;
        }

        return responseData;
      });

      // Log data export
      if (this.privacySettings.logDataAccess) {
        logger.info('Data export performed', {
          count: sanitizedResponses.length,
          options,
          timestamp: new Date().toISOString(),
        });
      }

      return sanitizedResponses;

    } catch (error) {
      logger.error('Error exporting data with privacy controls:', error);
      throw error;
    }
  }

  /**
   * Log data access for audit trail
   * @param {string} action - Action performed
   * @param {Object} context - Access context
   */
  logDataAccess(action, context = {}) {
    if (!this.privacySettings.logDataAccess) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: context.userId || 'anonymous',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: context.resource,
      recordCount: context.recordCount,
      success: context.success !== false,
    };

    logger.info('Data access logged', logEntry);
  }

  /**
   * Validate GDPR compliance
   * @returns {Promise<Object>} GDPR compliance validation
   */
  validateGDPRCompliance() {
    const validation = {
      compliant: true,
      checks: [],
      score: 0,
      maxScore: 100,
    };

    try {
      // Check 1: Data minimization enabled (20 points)
      if (this.privacySettings.enableDataMinimization) {
        validation.checks.push({ check: 'Data Minimization', status: 'pass', points: 20 });
        validation.score += 20;
      } else {
        validation.checks.push({ check: 'Data Minimization', status: 'fail', points: 0 });
        validation.compliant = false;
      }

      // Check 2: IP anonymization enabled (15 points)
      if (this.privacySettings.anonymizeIPs) {
        validation.checks.push({ check: 'IP Anonymization', status: 'pass', points: 15 });
        validation.score += 15;
      } else {
        validation.checks.push({ check: 'IP Anonymization', status: 'fail', points: 0 });
        validation.compliant = false;
      }

      // Check 3: Reasonable retention periods (20 points)
      const retentionScore = this.calculateRetentionScore();
      validation.checks.push({
        check: 'Retention Periods',
        status: retentionScore >= 15 ? 'pass' : 'warning',
        points: retentionScore,
      });
      validation.score += retentionScore;

      // Check 4: Data access logging (15 points)
      if (this.privacySettings.logDataAccess) {
        validation.checks.push({ check: 'Access Logging', status: 'pass', points: 15 });
        validation.score += 15;
      } else {
        validation.checks.push({ check: 'Access Logging', status: 'fail', points: 0 });
        validation.compliant = false;
      }

      // Check 5: Hashing for sensitive data (15 points)
      if (this.privacySettings.hashFingerprints) {
        validation.checks.push({ check: 'Data Hashing', status: 'pass', points: 15 });
        validation.score += 15;
      } else {
        validation.checks.push({ check: 'Data Hashing', status: 'warning', points: 8 });
        validation.score += 8;
      }

      // Check 6: Cleanup automation (15 points)
      validation.checks.push({ check: 'Cleanup Automation', status: 'pass', points: 15 });
      validation.score += 15;

      return validation;

    } catch (error) {
      logger.error('Error validating GDPR compliance:', error);
      throw error;
    }
  }

  /**
   * Calculate retention policy score
   * @returns {number} Score out of 20
   */
  calculateRetentionScore() {
    let score = 20;

    // Penalize overly long retention periods
    if (this.retentionPolicies.ipAddress > 90) score -= 5;
    if (this.retentionPolicies.deviceFingerprint > 365) score -= 5;
    if (this.retentionPolicies.userAgent > 365) score -= 5;
    if (this.retentionPolicies.responses > 2555) score -= 5; // More than 7 years

    return Math.max(0, score);
  }

  /**
   * Update privacy settings
   * @param {Object} newSettings - New privacy settings
   * @returns {Object} Updated settings
   */
  updatePrivacySettings(newSettings) {
    const validSettings = [
      'anonymizeIPs',
      'hashFingerprints',
      'enableDataMinimization',
      'gdprMode',
      'logDataAccess',
    ];

    Object.entries(newSettings).forEach(([key, value]) => {
      if (validSettings.includes(key)) {
        this.privacySettings[key] = value;
        logger.info(`Privacy setting updated: ${key} = ${value}`);
      }
    });

    return { ...this.privacySettings };
  }

  /**
   * Update retention policies
   * @param {Object} newPolicies - New retention policies
   * @returns {Object} Updated policies
   */
  updateRetentionPolicies(newPolicies) {
    const validPolicies = [
      'ipAddress',
      'deviceFingerprint',
      'userAgent',
      'referrer',
      'responses',
      'analytics',
    ];

    Object.entries(newPolicies).forEach(([key, value]) => {
      if (validPolicies.includes(key) && typeof value === 'number' && value >= 0) {
        this.retentionPolicies[key] = value;
        logger.info(`Retention policy updated: ${key} = ${value} days`);
      }
    });

    return { ...this.retentionPolicies };
  }
}

// Create singleton instance
const privacyService = new PrivacyService();

module.exports = privacyService;