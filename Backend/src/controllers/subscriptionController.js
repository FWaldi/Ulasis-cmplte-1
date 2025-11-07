'use strict';

const subscriptionService = require('../services/subscriptionService');
const logger = require('../utils/logger');

/**
 * Subscription controller handling all subscription-related API endpoints
 */
class SubscriptionController {
  /**
   * Get current subscription status
   * GET /api/v1/subscription/current
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentSubscription(req, res) {
    try {
      const userId = req.user.id;
      const result = await subscriptionService.getCurrentSubscription(userId);

      // Add upgrade suggestions if available
      if (res.locals.upgradeSuggestions && res.locals.upgradeSuggestions.length > 0) {
        result.data.upgrade_suggestions = res.locals.upgradeSuggestions;
      }

      res.json(result);
    } catch (error) {
      logger.error('Get current subscription error', {
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription status' },
      });
    }
  }

  /**
   * Get current usage statistics
   * GET /api/v1/subscription/usage
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsage(req, res) {
    try {
      const userId = req.user.id;
      const usage = await subscriptionService.getCurrentUsage(userId);

      const result = {
        success: true,
        data: {
          current_period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01 to ${new Date().toISOString().split('T')[0]}`,
          usage,
          upgrade_suggestions: res.locals.upgradeSuggestions || [],
        },
      };

      res.json(result);
    } catch (error) {
      logger.error('Get usage error', {
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage statistics' },
      });
    }
  }

  /**
   * Request subscription upgrade
   * POST /api/v1/subscription/upgrade-request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async requestUpgrade(req, res) {
    try {
      const userId = req.user.id;
      const { target_plan, reason } = req.body;

      if (!target_plan) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Target plan is required' },
        });
      }

      const result = await subscriptionService.requestUpgrade(userId, { target_plan, reason });

      res.json(result);
    } catch (error) {
      logger.error('Upgrade request error', {
        userId: req.user?.id,
        target_plan: req.body?.target_plan,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process upgrade request' },
      });
    }
  }

  /**
   * Get available subscription plans
   * GET /api/v1/subscription/plans
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getPlans(req, res) {
    try {
      const result = subscriptionService.getAvailablePlans();
      // Return plans array directly in data for API consistency
      res.json({
        success: true,
        data: result.data.plans,
      });
    } catch (error) {
      logger.error('Get plans error', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription plans' },
      });
    }
  }

  /**
   * Manual subscription management (admin only)
   * PUT /api/v1/subscription/manage
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async manageSubscription(req, res) {
    try {
      const { user_id, subscription_plan, subscription_status } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
        });
      }

      // Check if requester is admin (this should be handled by middleware)
      const result = await subscriptionService.manageSubscription(user_id, {
        subscription_plan,
        subscription_status,
      });

      logger.info('Subscription managed manually', {
        adminId: req.user.id,
        targetUserId: user_id,
        newPlan: subscription_plan,
        newStatus: subscription_status,
      });

      res.json(result);
    } catch (error) {
      logger.error('Manage subscription error', {
        adminId: req.user?.id,
        targetUserId: req.body?.user_id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to manage subscription' },
      });
    }
  }

  /**
   * Get payment history for user
   * GET /api/v1/subscription/payments
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const { PaymentTransaction } = require('../models');

      const transactions = await PaymentTransaction.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        attributes: ['id', 'payment_method', 'amount', 'currency', 'status', 'subscription_plan', 'created_at', 'processed_at'],
      });

      res.json({
        success: true,
        data: {
          transactions: transactions.map(t => ({
            id: t.id,
            payment_method: t.payment_method,
            amount: t.amount,
            currency: t.currency,
            status: t.status,
            subscription_plan: t.subscription_plan,
            created_at: t.created_at,
            processed_at: t.processed_at,
          })),
        },
      });
    } catch (error) {
      logger.error('Get payment history error', {
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payment history' },
      });
    }
  }

  /**
   * Generate upgrade suggestions
   * GET /api/v1/subscription/upgrade-suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUpgradeSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const result = await subscriptionService.generateUpgradePrompt(userId);
      res.json(result);
    } catch (error) {
      logger.error('Get upgrade suggestions error', {
        userId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get upgrade suggestions' },
      });
    }
  }

  /**
   * Get pending subscription requests (admin only)
   * GET /api/v1/subscription/requests/pending
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPendingRequests(req, res) {
    try {
      const filters = {};
      if (req.query.user_id) {
        filters.user_id = parseInt(req.query.user_id);
      }
      if (req.query.requested_plan) {
        filters.requested_plan = req.query.requested_plan;
      }

      const result = await subscriptionService.getPendingRequests(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get pending requests error', {
        adminId: req.user?.id,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get pending requests' },
      });
    }
  }

  /**
   * Get subscription request by ID (admin only)
   * GET /api/v1/subscription/requests/:requestId
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRequestById(req, res) {
    try {
      const { requestId } = req.params;
      const result = await subscriptionService.getRequestById(parseInt(requestId));
      res.json(result);
    } catch (error) {
      logger.error('Get request by ID error', {
        adminId: req.user?.id,
        requestId: req.params?.requestId,
        error: error.message,
      });

      if (error.message === 'Subscription request not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subscription request not found' },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription request' },
      });
    }
  }

  /**
   * Process subscription request (approve/reject) - admin only
   * POST /api/v1/subscription/requests/:requestId/process
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { action, admin_notes } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Action is required and must be "approve" or "reject"' },
        });
      }

      const result = await subscriptionService.processRequest(
        parseInt(requestId),
        { action, admin_notes },
        req.user.id,
      );

      logger.info('Subscription request processed', {
        adminId: req.user.id,
        requestId,
        action,
      });

      res.json(result);
    } catch (error) {
      logger.error('Process request error', {
        adminId: req.user?.id,
        requestId: req.params?.requestId,
        action: req.body?.action,
        error: error.message,
      });

      if (error.message === 'Subscription request not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subscription request not found' },
        });
      }

      if (error.message.includes('already')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: error.message },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process subscription request' },
      });
    }
  }
}

module.exports = new SubscriptionController();