'use strict';

const { body, validationResult } = require('express-validator');
const { NotificationPreference, NotificationHistory } = require('../models');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Notification controller for handling user notification preferences and history
 */
class NotificationController {
  /**
   * Validation middleware for notification preferences update
   */
  static validatePreferencesUpdate = [
    body('email_notifications')
      .isBoolean()
      .withMessage('email_notifications must be a boolean'),
    body('new_review_alerts')
      .isBoolean()
      .withMessage('new_review_alerts must be a boolean'),
    body('subscription_updates')
      .isBoolean()
      .withMessage('subscription_updates must be a boolean'),
    body('account_security')
      .isBoolean()
      .withMessage('account_security must be a boolean'),
  ];

  /**
   * Validation middleware for test email
   */
  static validateTestEmail = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ];

  /**
   * Get user notification preferences
   * GET /api/v1/notifications/preferences
   */
  static async getPreferences(req, res) {
    try {
      const userId = req.user.id;

      let preferences = await NotificationPreference.findOne({
        where: { user_id: userId },
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await NotificationPreference.create({
          user_id: userId,
          email_notifications: true,
          new_review_alerts: true,
          subscription_updates: true,
          account_security: true,
        });
      }

      res.json({
        success: true,
        data: {
          email_notifications: preferences.email_notifications,
          new_review_alerts: preferences.new_review_alerts,
          subscription_updates: preferences.subscription_updates,
          account_security: preferences.account_security,
        },
      });
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification preferences',
      });
    }
  }

  /**
   * Update user notification preferences
   * PUT /api/v1/notifications/preferences
   */
  static async updatePreferences(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const {
        email_notifications,
        new_review_alerts,
        subscription_updates,
        account_security,
      } = req.body;

      const [preferences] = await NotificationPreference.upsert(
        {
          user_id: userId,
          email_notifications,
          new_review_alerts,
          subscription_updates,
          account_security,
        },
        {
          returning: true,
        },
      );

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          email_notifications: preferences.email_notifications,
          new_review_alerts: preferences.new_review_alerts,
          subscription_updates: preferences.subscription_updates,
          account_security: preferences.account_security,
        },
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
      });
    }
  }

  /**
   * Get user notification history
   * GET /api/v1/notifications/history
   */
  static async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows: notifications } = await NotificationHistory.findAndCountAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'notification_type',
          'email_subject',
          'email_status',
          'sent_at',
          'delivered_at',
          'created_at',
        ],
      });

      res.json({
        success: true,
        data: {
          notifications: notifications.map(notification => ({
            id: notification.id,
            type: notification.notification_type,
            subject: notification.email_subject,
            status: notification.email_status,
            sent_at: notification.sent_at,
            delivered_at: notification.delivered_at,
            created_at: notification.created_at,
          })),
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification history',
      });
    }
  }

  /**
   * Send test email
   * POST /api/v1/notifications/test
   */
  static async sendTestEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { email } = req.body;

      // Send test email
      await emailService.testEmailConfiguration(email, userId);

      // Log to notification history
      await NotificationHistory.create({
        user_id: userId,
        notification_type: 'test',
        email_subject: 'Ulasis Email Configuration Test',
        email_status: 'sent',
        sent_at: new Date(),
      });

      res.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } catch (error) {
      logger.error('Error sending test email:', error);

      // Log failed test email
      try {
        await NotificationHistory.create({
          user_id: req.user.id,
          notification_type: 'test',
          email_subject: 'Ulasis Email Configuration Test',
          email_status: 'failed',
          error_message: error.message,
        });
      } catch (logError) {
        logger.error('Error logging test email failure:', logError);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
      });
    }
  }
}

module.exports = NotificationController;