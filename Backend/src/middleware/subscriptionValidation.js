'use strict';

const subscriptionService = require('../services/subscriptionService');
const logger = require('../utils/logger');

/**
 * Middleware for validating subscription limits and enforcing plan restrictions
 */
class SubscriptionValidation {
  /**
   * Validate questionnaire creation limit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async validateQuestionnaireLimit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'User not authenticated' },
        });
      }

      // TEMPORARY: Skip validation for business, admin, and starter plan users for demo purposes
      const user = await require('../models').User.findByPk(userId);
      if (user && (user.subscription_plan === 'business' || user.subscription_plan === 'admin' || user.subscription_plan === 'starter')) {
        console.log(`Skipping validation for ${user.subscription_plan} plan user`);
        return next();
      }

      const validation = await subscriptionService.checkLimit(userId, 'questionnaires', 1);

      if (!validation.allowed) {
        logger.warn('Questionnaire limit exceeded', {
          userId,
          reason: validation.reason,
          current: validation.current,
          limit: validation.limit,
        });

        return res.status(402).json({
          success: false,
          error: {
            code: validation.error_code,
            message: validation.reason,
            details: {
              current_usage: validation.current,
              limit: validation.limit,
              upgrade_required: true,
            },
          },
        });
      }

      // Increment usage after successful validation (always track usage)
      await subscriptionService.incrementUsage(userId, 'questionnaires', 1);
      next();
    } catch (error) {
      logger.error('Questionnaire validation middleware error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Validation failed' },
      });
    }
  }

  /**
   * Validate response submission limit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async validateResponseLimit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'User not authenticated' },
        });
      }

      const validation = await subscriptionService.checkLimit(userId, 'responses', 1);

      if (!validation.allowed) {
        logger.warn('Response limit exceeded', {
          userId,
          reason: validation.reason,
          current: validation.current,
          limit: validation.limit,
        });

        return res.status(402).json({
          success: false,
          error: {
            code: validation.error_code,
            message: validation.reason,
            details: {
              current_usage: validation.current,
              limit: validation.limit,
              upgrade_required: true,
            },
          },
        });
      }

      // Increment usage after successful validation
      await subscriptionService.incrementUsage(userId, 'responses', 1);

      next();
    } catch (error) {
      logger.error('Response validation middleware error', {
        userId: req.user?.id,
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Validation failed' },
      });
    }
  }

  /**
   * Validate export limit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async validateExportLimit(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'User not authenticated' },
        });
      }

      const format = req.query.format || 'csv';
      const subscription = await subscriptionService.getCurrentSubscription(userId);
      const plan = subscription.data.subscription_plan;

      // Check format restrictions based on plan
      if (format === 'excel' && plan !== 'business') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_ERROR_001',
            message: 'Insufficient Subscription',
            details: 'Excel export requires Business plan',
          },
        });
      }

      if (format === 'csv' && plan === 'free') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_ERROR_002',
            message: 'Insufficient Subscription',
            details: 'CSV export requires Starter or Business plan',
          },
        });
      }

      const validation = await subscriptionService.checkLimit(userId, 'exports', 1);

      if (!validation.allowed) {
        logger.warn('Export limit exceeded', {
          userId,
          reason: validation.reason,
          current: validation.current,
          limit: validation.limit,
        });

        return res.status(402).json({
          success: false,
          error: {
            code: validation.error_code,
            message: validation.reason,
            details: {
              current_usage: validation.current,
              limit: validation.limit,
              upgrade_required: true,
            },
          },
        });
      }

      // Increment usage after successful validation
      await subscriptionService.incrementUsage(userId, 'exports', 1);

      next();
    } catch (error) {
      logger.error('Export validation middleware error', {
        userId: req.user?.id,
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Validation failed' },
      });
    }
  }

  /**
   * Validate feature access based on subscription plan
   * @param {string} requiredFeature - Feature required for the endpoint
   * @returns {Function} Middleware function
   */
  validateFeatureAccess(requiredFeature) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: { code: 'AUTH_ERROR', message: 'User not authenticated' },
          });
        }

        const subscription = await subscriptionService.getCurrentSubscription(userId);
        const userFeatures = subscription.data.features;

        if (!userFeatures.includes(requiredFeature)) {
          logger.warn('Feature access denied', {
            userId,
            requiredFeature,
            userPlan: subscription.data.subscription_plan,
            userFeatures,
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'SUBSCRIPTION_ERROR_003',
              message: `Feature '${requiredFeature}' not available for current subscription plan`,
              details: {
                current_plan: subscription.data.subscription_plan,
                required_feature: requiredFeature,
                available_features: userFeatures,
                upgrade_required: true,
              },
            },
          });
        }

        next();
      } catch (error) {
        logger.error('Feature access validation error', {
          userId: req.user?.id,
          requiredFeature,
          error: error.message,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Feature validation failed' },
        });
      }
    };
  }

  /**
   * Check if user has active subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async requireActiveSubscription(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'User not authenticated' },
        });
      }

      const subscription = await subscriptionService.getCurrentSubscription(userId);

      if (subscription.data.subscription_status !== 'active') {
        logger.warn('Inactive subscription access attempt', {
          userId,
          status: subscription.data.subscription_status,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_ERROR_005',
            message: 'Subscription is not active',
            details: {
              subscription_status: subscription.data.subscription_status,
            },
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Active subscription check error', {
        userId: req.user?.id,
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Subscription check failed' },
      });
    }
  }

  /**
   * Add upgrade prompt to response if limits are approaching
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async addUpgradePrompt(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next();
      }

      const upgradePrompt = await subscriptionService.generateUpgradePrompt(userId);

      // Store upgrade suggestions in res.locals for use in controllers
      res.locals.upgradeSuggestions = upgradePrompt.data.upgrade_suggestions;

      next();
    } catch (error) {
      logger.error('Add upgrade prompt error', {
        userId: req.user?.id,
        error: error.message,
      });
      // Don't fail the request if upgrade prompt fails
      res.locals.upgradeSuggestions = [];
      next();
    }
  }
}

module.exports = new SubscriptionValidation();