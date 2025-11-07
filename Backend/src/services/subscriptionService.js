'use strict';

const { User, SubscriptionUsage, PaymentTransaction, SubscriptionRequest } = require('../models');
const logger = require('../utils/logger');
const emailService = require('./emailService');

/**
 * Subscription service containing business logic for subscription management
 */
class SubscriptionService {
  constructor() {
    // Plan limitations - null means unlimited
    this.PLAN_LIMITS = {
      free: {
        questionnaires: 1,
        responses: 50,
        exports: 5,
      },
      starter: {
        questionnaires: 5,
        responses: 500,
        exports: 50,
      },
      business: {
        questionnaires: null, // unlimited
        responses: null,
        exports: null,
      },
      admin: {
        questionnaires: null, // unlimited
        responses: null,
        exports: null,
      },
    };

    // Plan hierarchy for upgrade/downgrade detection
    this.PLAN_HIERARCHY = {
      free: 1,
      starter: 2,
      business: 3,
      admin: 4,
    };
  }

  /**
   * Get current subscription status for a user
   * @param {number} userId - User ID
   * @returns {Object} Subscription status
   */
  async getCurrentSubscription(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Debug: Check if we got the right user
      if (user.id !== userId) {
        throw new Error(`User ID mismatch: expected ${userId}, got ${user.id}`);
      }

      const usage = await this.getCurrentUsage(userId);
      const planLimits = this.getPlanLimits(user.subscription_plan);

      // Convert limits to match usage structure
      const limits = {};
      Object.keys(planLimits).forEach(type => {
        limits[type] = {
          limit: planLimits[type],
        };
      });

      return {
        success: true,
        data: {
          user_id: user.id,
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
          email: user.email,
          email_verified: user.email_verified,
          limits,
          usage,
          features: this.getPlanFeatures(user.subscription_plan),
          unlimited_data_retention: true, // All plans have unlimited retention
        },
      };
    } catch (error) {
      logger.error('Get current subscription failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get current usage statistics for a user
   * @param {number} userId - User ID
   * @returns {Object} Usage statistics
   */
  async getCurrentUsage(userId) {
    try {
      const usageRecords = await SubscriptionUsage.findAll({
        where: { user_id: userId },
        attributes: ['usage_type', 'current_count', 'limit_count'],
      });

      const usage = {};
      usageRecords.forEach(record => {
        usage[record.usage_type] = {
          used: record.current_count,
          limit: record.limit_count,
        };
      });

      // Ensure all usage types are present
      ['questionnaires', 'responses', 'exports'].forEach(type => {
        if (!usage[type]) {
          usage[type] = { used: 0, limit: null };
        }
      });

      return usage;
    } catch (error) {
      logger.error('Get current usage failed', {
        userId,
        error: error.message,
      });
      // Return default usage if error
      return {
        questionnaires: { used: 0, limit: null },
        responses: { used: 0, limit: null },
        exports: { used: 0, limit: null },
      };
    }
  }

  /**
   * Check if user can perform an action based on subscription limits
   * @param {number} userId - User ID
   * @param {string} actionType - Type of action (questionnaires, responses, exports)
   * @param {number} count - Number of items to check (default 1)
   * @returns {Object} Validation result
   */
  async checkLimit(userId, actionType, count = 1) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.subscription_status !== 'active') {
        return {
          allowed: false,
          reason: 'Subscription is not active',
          error_code: 'SUBSCRIPTION_ERROR_005',
        };
      }

      const limits = this.getPlanLimits(user.subscription_plan);
      const limit = limits[actionType];

      // Unlimited plans always allowed
      if (limit === null) {
        return { allowed: true };
      }

      const currentUsage = await this.getUsageCount(userId, actionType);
      const newTotal = currentUsage + count;

      if (newTotal > limit) {
        return {
          allowed: false,
          reason: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} limit exceeded for ${user.subscription_plan} plan`,
          error_code: `SUBSCRIPTION_ERROR_00${actionType === 'questionnaires' ? '1' : actionType === 'responses' ? '2' : '3'}`,
          current: currentUsage,
          limit,
          requested: count,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Check limit failed', {
        userId,
        actionType,
        count,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Increment usage count for a user
   * @param {number} userId - User ID
   * @param {string} actionType - Type of action
   * @param {number} count - Number to increment (default 1)
   */
  async incrementUsage(userId, actionType, count = 1) {
    try {
      const userPlan = await this.getUserPlan(userId);
      const limit = this.getPlanLimits(userPlan)[actionType];

      const [usageRecord] = await SubscriptionUsage.findOrCreate({
        where: { user_id: userId, usage_type: actionType },
        defaults: {
          user_id: userId,
          usage_type: actionType,
          current_count: 0,
          limit_count: limit,
        },
      });

      usageRecord.current_count += count;
      await usageRecord.save();

      logger.info('Usage incremented', {
        userId,
        actionType,
        count,
        newTotal: usageRecord.current_count,
      });
    } catch (error) {
      logger.error('Increment usage failed', {
        userId,
        actionType,
        count,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get usage count for a specific type
   * @param {number} userId - User ID
   * @param {string} actionType - Type of action
   * @returns {number} Current usage count
   */
  async getUsageCount(userId, actionType) {
    try {
      const usageRecord = await SubscriptionUsage.findOne({
        where: { user_id: userId, usage_type: actionType },
        attributes: ['current_count'],
      });

      return usageRecord ? usageRecord.current_count : 0;
    } catch (error) {
      logger.error('Get usage count failed', {
        userId,
        actionType,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get plan limits for a subscription plan
   * @param {string} plan - Subscription plan
   * @returns {Object} Plan limits
   */
  getPlanLimits(plan) {
    return this.PLAN_LIMITS[plan] || this.PLAN_LIMITS.free;
  }

  /**
   * Get plan features for a subscription plan
   * @param {string} plan - Subscription plan
   * @returns {Array} Plan features
   */
  getPlanFeatures(plan) {
    const baseFeatures = ['analytics', 'qr_codes'];
    const planFeatures = {
      free: baseFeatures,
      starter: [...baseFeatures, 'csv_export'],
      business: [...baseFeatures, 'csv_export', 'excel_export', 'advanced_analytics', 'api_access'],
      admin: [...baseFeatures, 'csv_export', 'excel_export', 'advanced_analytics', 'api_access', 'admin_access'],
    };
    return planFeatures[plan] || planFeatures.free;
  }

  /**
   * Get user's subscription plan
   * @param {number} userId - User ID
   * @returns {string} Plan name
   */
  async getUserPlan(userId) {
    const user = await User.findByPk(userId, { attributes: ['subscription_plan'] });
    return user ? user.subscription_plan : 'free';
  }

  /**
   * Generate upgrade prompt based on current usage and limits
   * @param {number} userId - User ID
   * @returns {Object} Upgrade suggestions
   */
  async generateUpgradePrompt(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const usage = await this.getCurrentUsage(userId);
      const limits = this.getPlanLimits(user.subscription_plan);
      const suggestions = [];

      // Check each usage type
      Object.keys(usage).forEach(type => {
        const used = usage[type].used;
        const limit = limits[type];
        if (limit && used >= limit * 0.8) { // 80% usage threshold
          const nextPlan = this.getNextPlan(user.subscription_plan);
          if (nextPlan) {
            suggestions.push({
              plan: nextPlan,
              reason: `${type}_limit_approaching`,
              benefit: `Increase ${type} limit`,
              current_limit: limit,
              next_limit: this.getPlanLimits(nextPlan)[type],
            });
          }
        }
      });

      return {
        success: true,
        data: {
          current_plan: user.subscription_plan,
          upgrade_suggestions: suggestions,
        },
      };
    } catch (error) {
      logger.error('Generate upgrade prompt failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get next higher plan
   * @param {string} currentPlan - Current plan
   * @returns {string|null} Next plan or null
   */
  getNextPlan(currentPlan) {
    const planOrder = ['free', 'starter', 'business'];
    const currentIndex = planOrder.indexOf(currentPlan);
    return currentIndex < planOrder.length - 1 ? planOrder[currentIndex + 1] : null;
  }

  /**
   * Enforce unlimited data retention (no-op for now, all plans have unlimited)
   * @param {number} userId - User ID
   */
  enforceDataRetention(userId) {
    // All plans have unlimited data retention
    // This method exists for future expansion if needed
    logger.info('Data retention enforced', { userId });
  }

  /**
   * Request subscription upgrade (admin approval workflow)
   * @param {number} userId - User ID
   * @param {Object} upgradeData - Upgrade request data
   * @returns {Object} Upgrade request result
   */
  async requestUpgrade(userId, upgradeData) {
    try {
      const { target_plan, reason } = upgradeData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate target plan
      if (!this.PLAN_LIMITS[target_plan]) {
        return {
          success: false,
          error: {
            code: 'INVALID_PLAN',
            message: 'Invalid target plan specified',
          },
        };
      }

      // Check if user already has a pending request
      const existingRequest = await SubscriptionRequest.findOne({
        where: {
          user_id: userId,
          status: 'pending',
        },
      });

      if (existingRequest) {
        return {
          success: false,
          error: {
            code: 'PENDING_REQUEST_EXISTS',
            message: 'You already have a pending subscription request. Please wait for it to be processed.',
          },
        };
      }

      // Determine environment-specific settings
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isUpgrade = this.isUpgrade(user.subscription_plan, target_plan);
      const paymentRequired = !isDevelopment && isUpgrade;

      // Create subscription request
      const subscriptionRequest = await SubscriptionRequest.create({
        user_id: userId,
        requested_plan: target_plan,
        current_plan: user.subscription_plan,
        reason: reason || null,
        status: 'pending',
        payment_method: paymentRequired ? 'dana' : 'manual',
        amount: paymentRequired ? this.getPlanPrice(target_plan) : null,
        currency: paymentRequired ? 'IDR' : null,
        payment_url: paymentRequired ? `https://dana.link/payment/req-${Date.now()}` : null,
      });

      // Send notification to admins/owners
      try {
        await this.notifyAdminsOfRequest(subscriptionRequest, user);
      } catch (notificationError) {
        logger.error('Failed to notify admins of subscription request', {
          requestId: subscriptionRequest.id,
          error: notificationError.message,
        });
        // Don't fail the request if notification fails
      }

      logger.info('Subscription request created', {
        userId,
        target_plan,
        requestId: subscriptionRequest.id,
        paymentRequired,
      });

      const responseMessage = isDevelopment
        ? 'Subscription request received. The admin team will review your request and contact you soon.'
        : paymentRequired
          ? 'Subscription request received. Please complete payment to proceed with the approval process.'
          : 'Subscription request received and is now pending admin approval.';

      return {
        success: true,
        message: responseMessage,
        data: {
          request_id: subscriptionRequest.id,
          status: 'pending',
          payment_required: paymentRequired,
          payment_url: subscriptionRequest.payment_url,
          amount: subscriptionRequest.amount,
          currency: subscriptionRequest.currency,
          estimated_processing_time: isDevelopment ? '1-2 business days' : '24-48 hours',
        },
      };
    } catch (error) {
      logger.error('Subscription request failed', {
        userId,
        upgradeData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get plan pricing (placeholder)
   * @param {string} plan - Plan name
   * @returns {number} Price in IDR
   */
  getPlanPrice(plan) {
    const prices = {
      starter: 99000, // ~$7 USD
      business: 299000, // ~$20 USD
    };
    return prices[plan] || 0;
  }

  /**
   * List available plans
   * @returns {Object} Available plans
   */
  getAvailablePlans() {
    return {
      success: true,
      data: {
        plans: Object.keys(this.PLAN_LIMITS).map(plan => ({
          name: plan,
          limits: this.PLAN_LIMITS[plan],
          features: this.getPlanFeatures(plan),
          price: this.getPlanPrice(plan),
          currency: 'IDR',
        })),
      },
    };
  }

  /**
   * Manually manage subscription (admin function)
   * @param {number} userId - User ID
   * @param {Object} managementData - Management data
   * @returns {Object} Management result
   */
  async manageSubscription(userId, managementData) {
    try {
      const { subscription_plan, subscription_status } = managementData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Store old plan for email notification
      const oldPlan = user.subscription_plan;

      // Update subscription
      if (subscription_plan) {
        user.subscription_plan = subscription_plan;
      }
      if (subscription_status) {
        user.subscription_status = subscription_status;
      }

      await user.save();

      // Reset usage if plan changed
      if (subscription_plan) {
        await this.resetUsageForPlan(userId, subscription_plan);
      }

      // Send subscription change notification email if plan changed
      if (subscription_plan && subscription_plan !== oldPlan) {
        try {
          await emailService.sendSubscriptionChangeEmail(user, {
            oldPlan,
            newPlan: subscription_plan,
            effectiveDate: new Date(),
            upgrade: this.isUpgrade(oldPlan, subscription_plan),
            downgrade: this.isDowngrade(oldPlan, subscription_plan),
          });
          logger.info('Subscription change email sent', { userId, oldPlan, newPlan: subscription_plan });
        } catch (emailError) {
          logger.error('Failed to send subscription change email', {
            userId,
            oldPlan,
            newPlan: subscription_plan,
            error: emailError.message,
          });
          // Don't fail the subscription update if email fails
        }
      }

      logger.info('Subscription managed', {
        userId,
        newPlan: subscription_plan,
        newStatus: subscription_status,
      });

      return {
        success: true,
        message: 'Subscription updated successfully',
        data: {
          user_id: user.id,
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
        },
      };
    } catch (error) {
      logger.error('Manage subscription failed', {
        userId,
        managementData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reset usage counters when plan changes
   * @param {number} userId - User ID
   * @param {string} newPlan - New plan
   */
  async resetUsageForPlan(userId, newPlan) {
    try {
      const limits = this.getPlanLimits(newPlan);

      for (const [type, limit] of Object.entries(limits)) {
        await SubscriptionUsage.upsert({
          user_id: userId,
          usage_type: type,
          current_count: 0,
          limit_count: limit,
        });
      }

      logger.info('Usage reset for plan change', { userId, newPlan });
    } catch (error) {
      logger.error('Reset usage failed', {
        userId,
        newPlan,
        error: error.message,
      });
    }
  }

  /**
   * Check if plan change is an upgrade
   * @param {string} oldPlan - Old plan name
   * @param {string} newPlan - New plan name
   * @returns {boolean} True if upgrade
   */
  isUpgrade(oldPlan, newPlan) {
    const oldLevel = this.PLAN_HIERARCHY[oldPlan] || 0;
    const newLevel = this.PLAN_HIERARCHY[newPlan] || 0;
    return newLevel > oldLevel;
  }

  /**
   * Check if plan change is a downgrade
   * @param {string} oldPlan - Old plan name
   * @param {string} newPlan - New plan name
   * @returns {boolean} True if downgrade
   */
  isDowngrade(oldPlan, newPlan) {
    const oldLevel = this.PLAN_HIERARCHY[oldPlan] || 0;
    const newLevel = this.PLAN_HIERARCHY[newPlan] || 0;
    return newLevel < oldLevel;
  }

  /**
   * Get all pending subscription requests (admin function)
   * @param {Object} filters - Optional filters
   * @returns {Object} List of pending requests
   */
  async getPendingRequests(filters = {}) {
    try {
      const whereClause = { status: 'pending', ...filters };

      const requests = await SubscriptionRequest.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
        order: [['created_at', 'ASC']],
      });

      return {
        success: true,
        data: {
          requests: requests.map(req => ({
            id: req.id,
            user_id: req.user_id,
            user_name: `${req.user.first_name} ${req.user.last_name}`.trim(),
            user_email: req.user.email,
            current_plan: req.current_plan,
            requested_plan: req.requested_plan,
            reason: req.reason,
            created_at: req.created_at,
            payment_required: req.payment_method !== 'manual',
            amount: req.amount,
            currency: req.currency,
            payment_url: req.payment_url,
          })),
          total: requests.length,
        },
      };
    } catch (error) {
      logger.error('Get pending requests failed', {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process subscription request (approve/reject)
   * @param {number} requestId - Request ID
   * @param {Object} processData - Processing data
   * @param {number} processedBy - Admin user ID
   * @returns {Object} Processing result
   */
  async processRequest(requestId, processData, processedBy) {
    try {
      const { action, admin_notes } = processData;

      if (!['approve', 'reject'].includes(action)) {
        throw new Error('Invalid action. Must be "approve" or "reject"');
      }

      const request = await SubscriptionRequest.findByPk(requestId, {
        include: [
          {
            model: User,
            as: 'user',
          },
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
      });

      if (!request) {
        throw new Error('Subscription request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}`);
      }

      // Update request
      request.status = action === 'approve' ? 'approved' : 'rejected';
      request.admin_notes = admin_notes || null;
      request.processed_by = processedBy;
      request.processed_at = new Date();
      await request.save();

      const processor = await User.findByPk(processedBy);
      const processorName = `${processor.first_name} ${processor.last_name}`.trim();

      if (action === 'approve') {
        // Update user's subscription
        await this.manageSubscription(request.user_id, {
          subscription_plan: request.requested_plan,
          subscription_status: 'active',
        });

        // Send approval email to user
        try {
          await emailService.sendSubscriptionApprovedEmail(request.user, {
            request_id: request.id,
            old_plan: request.current_plan,
            new_plan: request.requested_plan,
            approved_date: request.processed_at,
            admin_name: processorName,
            admin_notes,
            payment_required: request.payment_method !== 'manual',
            payment_url: request.payment_url,
            amount: request.amount,
            currency: request.currency,
          });
        } catch (emailError) {
          logger.error('Failed to send approval email', {
            requestId: request.id,
            error: emailError.message,
          });
        }

        logger.info('Subscription request approved', {
          requestId: request.id,
          userId: request.user_id,
          newPlan: request.requested_plan,
          processedBy,
        });
      } else {
        // Send rejection email to user
        try {
          await emailService.sendSubscriptionRejectedEmail(request.user, {
            request_id: request.id,
            current_plan: request.current_plan,
            requested_plan: request.requested_plan,
            rejected_date: request.processed_at,
            admin_name: processorName,
            rejection_reason: admin_notes || 'Request does not meet our current requirements.',
            admin_notes,
          });
        } catch (emailError) {
          logger.error('Failed to send rejection email', {
            requestId: request.id,
            error: emailError.message,
          });
        }

        logger.info('Subscription request rejected', {
          requestId: request.id,
          userId: request.user_id,
          requestedPlan: request.requested_plan,
          processedBy,
          reason: admin_notes,
        });
      }

      return {
        success: true,
        message: `Subscription request ${action}d successfully`,
        data: {
          request_id: request.id,
          status: request.status,
          user_id: request.user_id,
          user_email: request.user.email,
          processed_by: processedBy,
          processed_at: request.processed_at,
        },
      };
    } catch (error) {
      logger.error('Process subscription request failed', {
        requestId,
        processData,
        processedBy,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get subscription request by ID
   * @param {number} requestId - Request ID
   * @returns {Object} Request details
   */
  async getRequestById(requestId) {
    try {
      const request = await SubscriptionRequest.findByPk(requestId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name', 'subscription_plan', 'subscription_status'],
          },
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'email', 'first_name', 'last_name'],
          },
        ],
      });

      if (!request) {
        throw new Error('Subscription request not found');
      }

      return {
        success: true,
        data: {
          id: request.id,
          user: {
            id: request.user.id,
            name: `${request.user.first_name} ${request.user.last_name}`.trim(),
            email: request.user.email,
            current_plan: request.user.subscription_plan,
            subscription_status: request.user.subscription_status,
          },
          requested_plan: request.requested_plan,
          current_plan: request.current_plan,
          reason: request.reason,
          status: request.status,
          admin_notes: request.admin_notes,
          created_at: request.created_at,
          processed_at: request.processed_at,
          processor: request.processor ? {
            id: request.processor.id,
            name: `${request.processor.first_name} ${request.processor.last_name}`.trim(),
            email: request.processor.email,
          } : null,
          payment_required: request.payment_method !== 'manual',
          payment_method: request.payment_method,
          payment_url: request.payment_url,
          amount: request.amount,
          currency: request.currency,
        },
      };
    } catch (error) {
      logger.error('Get request by ID failed', {
        requestId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Notify admins of new subscription request
   * @param {Object} request - Subscription request object
   * @param {Object} user - User object
   */
  async notifyAdminsOfRequest(request, user) {
    try {
      // Get admin users (you may need to adjust this based on your admin detection logic)
      const adminUsers = await User.findAll({
        where: {
          subscription_plan: 'admin', // or however you identify admins
        },
        attributes: ['email', 'first_name', 'last_name'],
      });

      if (adminUsers.length === 0) {
        // Fallback to a default admin email if no admin users exist
        adminUsers.push({
          email: process.env.ADMIN_EMAIL || 'admin@ulasis.com',
          first_name: 'Admin',
          last_name: 'User',
        });
      }

      const emailData = {
        user_name: `${user.first_name} ${user.last_name}`.trim(),
        user_email: user.email,
        user_id: user.id,
        request_id: request.id,
        request_date: request.created_at,
        current_plan: request.current_plan,
        requested_plan: request.requested_plan,
        reason: request.reason,
        payment_required: request.payment_method !== 'manual',
        payment_url: request.payment_url,
        amount: request.amount,
        currency: request.currency,
        admin_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin`,
      };

      // Send email to all admins
      for (const admin of adminUsers) {
        await emailService.sendSubscriptionRequestEmail(admin, emailData);
      }

      logger.info('Admins notified of subscription request', {
        requestId: request.id,
        adminCount: adminUsers.length,
      });
    } catch (error) {
      logger.error('Failed to notify admins of subscription request', {
        requestId: request.id,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new SubscriptionService();