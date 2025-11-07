'use strict';

const { AuditLog } = require('../models');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Audit Service
 * Handles audit logging with encryption for sensitive data
 */
class AuditService {
  constructor() {
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-audit-key-change-in-production';
  }

  /**
   * Log an audit event
   */
  async logEvent(data) {
    try {
      const {
        user_id,
        action,
        resource_type,
        resource_id,
        details = {},
        ip_address,
        user_agent,
      } = data;

      // Encrypt sensitive details
      const encryptedDetails = this.encryptSensitiveData(details);

      const auditEntry = {
        user_id,
        action,
        resource_type,
        resource_id,
        details: encryptedDetails,
        ip_address,
        user_agent,
        timestamp: new Date(),
      };

      await AuditLog.create(auditEntry);

      logger.debug('Audit event logged', {
        action,
        resource_type,
        user_id,
      });
    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error.message,
        action: data.action,
      });
      // Don't throw - audit failures shouldn't break main functionality
    }
  }

  /**
   * Encrypt sensitive data in audit details
   */
  encryptSensitiveData(details) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'];
    const encrypted = { ...details };

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Encrypt a value
   */
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a value
   */
  decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt audit data', { error: error.message });
      return '[ENCRYPTED]';
    }
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await AuditLog.destroy({
        where: {
          timestamp: {
            [require('sequelize').Op.lt]: cutoffDate,
          },
        },
      });

      if (deletedCount > 0) {
        logger.info('Old audit logs cleaned up', { deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Audit log cleanup error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs with decryption
   */
  async getAuditLogs(filters = {}) {
    try {
      const logs = await AuditLog.findAll({
        where: filters.where || {},
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: require('../models').User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
            required: false,
          },
        ],
      });

      // Decrypt sensitive data for display
      const decryptedLogs = logs.map(log => {
        const logData = log.toJSON();
        if (logData.details) {
          logData.details = this.decryptSensitiveData(logData.details);
        }
        return logData;
      });

      return decryptedLogs;
    } catch (error) {
      logger.error('Failed to get audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt sensitive data for display
   */
  decryptSensitiveData(details) {
    const decrypted = { ...details };

    for (const [key, value] of Object.entries(decrypted)) {
      if (typeof value === 'string' && value.includes(':')) {
        try {
          decrypted[key] = this.decrypt(value);
        } catch (e) {
          // Keep encrypted if decryption fails
        }
      }
    }

    return decrypted;
  }
}

module.exports = new AuditService();