'use strict';

const { User, AuditLog, Review, Response, Questionnaire } = require('../models');
const { Op } = require('sequelize');
const monitoringService = require('../services/monitoringService');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');

/**
 * Admin controller for user management and system administration
 */
class AdminController {
  /**
   * Get all users with pagination and filtering
   */
  static async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        subscription_plan,
        subscription_status,
        email_verified,
        is_active,
        role,
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (search) {
        where[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
        ];
      }

      if (subscription_plan) where.subscription_plan = subscription_plan;
      if (subscription_status) where.subscription_status = subscription_status;
      if (email_verified !== undefined) where.email_verified = email_verified === 'true';
      if (is_active !== undefined) where.is_active = is_active === 'true';
      if (role) where.role = role;

      // Use separate calls instead of findAndCountAll to avoid potential issues
      const count = await User.count({ where });
      const users = await User.findAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        attributes: [
          'id', 'email', 'first_name', 'last_name', 'subscription_plan',
          'subscription_status', 'email_verified', 'last_login_at', 'created_at', 'role',
        ],
      });

      // Log admin action
      // TODO: Fix AuditLog issue - temporarily commented out
      // await AuditLog.create({
      //   user_id: req.userProfile.id,
      //   action: 'VIEW_USERS',
      //   resource_type: 'user',
      //   resource_id: null,
      //   details: { filters: req.query, count },
      //   ip_address: req.ip,
      //   user_agent: req.get('User-Agent'),
      //   timestamp: new Date(),
      // });

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get users admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Update user details
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const {
        subscription_plan,
        subscription_status,
        first_name,
        last_name,
        is_active,
        role,
      } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'The specified user does not exist.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const oldValues = {
        subscription_plan: user.subscription_plan,
        subscription_status: user.subscription_status,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        role: user.role,
      };

      // Update user
      await user.update({
        subscription_plan,
        subscription_status,
        first_name,
        last_name,
        is_active,
        role,
      });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'UPDATE_USER',
        resource_type: 'user',
        resource_id: id,
        details: { oldValues, newValues: req.body },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            subscription_plan: user.subscription_plan,
            subscription_status: user.subscription_status,
            is_active: user.is_active,
            role: user.role,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Update user admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        targetUserId: req.params.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Suspend or activate user
   */
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'suspend' or 'activate'

      if (!['suspend', 'activate'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Action',
          message: 'Action must be either "suspend" or "activate".',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'The specified user does not exist.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const newStatus = action === 'suspend' ? 'suspended' : 'active';
      const oldStatus = user.subscription_status;

      await user.update({ subscription_status: newStatus });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: `${action.toUpperCase()}_USER`,
        resource_type: 'user',
        resource_id: id,
        details: { oldStatus, newStatus },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `User ${action}d successfully`,
        data: {
          user: {
            id: user.id,
            email: user.email,
            subscription_status: user.subscription_status,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Toggle user status admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        targetUserId: req.params.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update user status',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Update user subscription plan and status
   */
  static async updateUserSubscription(req, res) {
    try {
      const { id } = req.params;
      const { subscription_plan, subscription_status } = req.body;

      if (!subscription_plan || !subscription_status) {
        return res.status(400).json({
          success: false,
          error: 'Missing Required Fields',
          message: 'Both subscription_plan and subscription_status are required.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const validPlans = ['free', 'starter', 'business', 'enterprise'];
      const validStatuses = ['active', 'inactive', 'suspended', 'cancelled'];

      if (!validPlans.includes(subscription_plan)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Subscription Plan',
          message: `Subscription plan must be one of: ${validPlans.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (!validStatuses.includes(subscription_status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Subscription Status',
          message: `Subscription status must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'The specified user does not exist.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const oldPlan = user.subscription_plan;
      const oldStatus = user.subscription_status;

      await user.update({
        subscription_plan,
        subscription_status,
      });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'UPDATE_USER_SUBSCRIPTION',
        resource_type: 'user',
        resource_id: id,
        details: {
          oldPlan,
          newPlan: subscription_plan,
          oldStatus,
          newStatus: subscription_status,
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'User subscription updated successfully',
        data: {
          id: user.id,
          email: user.email,
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
          updated_at: user.updated_at,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Update user subscription admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        targetUserId: req.params.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update user subscription',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get audit logs with pagination and filtering
   */
  static async getAuditLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        user_id,
        action,
        resource_type,
        start_date,
        end_date,
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (user_id) where.user_id = user_id;
      if (action) where.action = action;
      if (resource_type) where.resource_type = resource_type;

      if (start_date || end_date) {
        where.timestamp = {};
        if (start_date) where.timestamp[Op.gte] = new Date(start_date);
        if (end_date) where.timestamp[Op.lte] = new Date(end_date);
      }

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
            required: false,
          },
        ],
      });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_AUDIT_LOGS',
        resource_type: 'audit_log',
        resource_id: null,
        details: { filters: req.query, count },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get audit logs admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(req, res) {
    try {
      const health = await monitoringService.getSystemHealth();

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_SYSTEM_HEALTH',
        resource_type: 'system',
        resource_id: null,
        details: { status: health.status },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get system health admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(req, res) {
    try {
      const { metric_type, start_date, end_date, limit } = req.query;

      const metrics = await monitoringService.getSystemMetrics({
        metric_type,
        start_date,
        end_date,
        limit,
      });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_SYSTEM_METRICS',
        resource_type: 'system',
        resource_id: null,
        details: { metric_count: metrics.length },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          metrics,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get system metrics admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Create database backup
   */
  static async createBackup(req, res) {
    try {
      const backup = await backupService.createBackup();

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'CREATE_BACKUP',
        resource_type: 'backup',
        resource_id: null,
        details: { backupName: backup.name, size: backup.size },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Backup created successfully',
        data: backup,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Create backup admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get list of backups
   */
  static async getBackups(req, res) {
    try {
      const backups = await backupService.getBackups();

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_BACKUPS',
        resource_type: 'backup',
        resource_id: null,
        details: { count: backups.length },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          backups,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get backups admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backups',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Restore database from backup
   */
  static async restoreBackup(req, res) {
    try {
      const { backupName } = req.params;
      const { dropDatabase = false } = req.body;

      const result = await backupService.restoreBackup(backupName, { dropDatabase });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'RESTORE_BACKUP',
        resource_type: 'backup',
        resource_id: null,
        details: { backupName, dropDatabase },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Database restored successfully',
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Restore backup admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        backupName: req.params.backupName,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to restore backup',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get reviews for moderation
   */
  static async getReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        assigned_to,
        auto_flagged,
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (status) where.review_status = status;
      if (priority) where.priority = priority;
      if (assigned_to) where.assigned_to = assigned_to;
      if (auto_flagged !== undefined) where.auto_flagged = auto_flagged === 'true';

      const { count, rows: reviews } = await Review.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC'],
        ],
        include: [
          {
            model: Response,
            as: 'response',
            attributes: ['id', 'questionnaire_id', 'user_id', 'submitted_at'],
          },
          {
            model: User,
            as: 'assignedAdmin',
            attributes: ['id', 'email', 'first_name', 'last_name'],
            required: false,
          },
        ],
      });

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_REVIEWS',
        resource_type: 'review',
        resource_id: null,
        details: { filters: req.query, count },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          reviews,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get reviews admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reviews',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Update review status
   */
  static async updateReview(req, res) {
    try {
      const { id } = req.params;
      const {
        review_status,
        admin_notes,
        internal_comments,
        assigned_to,
        priority,
        quality_score,
      } = req.body;

      const review = await Review.findByPk(id, {
        include: [
          {
            model: Response,
            as: 'response',
          },
        ],
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review Not Found',
          message: 'The specified review does not exist.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const oldValues = {
        review_status: review.review_status,
        admin_notes: review.admin_notes,
        internal_comments: review.internal_comments,
        assigned_to: review.assigned_to,
        priority: review.priority,
        quality_score: review.quality_score,
      };

      const updateData = {};
      if (review_status) updateData.review_status = review_status;
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
      if (internal_comments !== undefined) updateData.internal_comments = internal_comments;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      if (priority) updateData.priority = priority;
      if (quality_score !== undefined) updateData.quality_score = quality_score;

      if (review_status === 'approved' || review_status === 'rejected') {
        updateData.processed_at = new Date();
        updateData.reviewed_by = req.userProfile.id;
        updateData.review_duration = Math.floor((Date.now() - review.created_at.getTime()) / 1000);
      }

      await review.update(updateData);

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'UPDATE_REVIEW',
        resource_type: 'review',
        resource_id: id,
        details: { oldValues, newValues: updateData },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: { review },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Update review admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        reviewId: req.params.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update review',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Bulk update reviews
   */
  static async bulkUpdateReviews(req, res) {
    try {
      const { reviewIds, updates } = req.body;

      if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Request',
          message: 'reviewIds must be a non-empty array.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const results = [];
      for (const reviewId of reviewIds) {
        try {
          const review = await Review.findByPk(reviewId);
          if (review) {
            await review.update(updates);
            results.push({ id: reviewId, success: true });
          } else {
            results.push({ id: reviewId, success: false, error: 'Review not found' });
          }
        } catch (error) {
          results.push({ id: reviewId, success: false, error: error.message });
        }
      }

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'BULK_UPDATE_REVIEWS',
        resource_type: 'review',
        resource_id: null,
        details: { reviewIds, updates, resultsCount: results.length },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Bulk update completed',
        data: { results },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Bulk update reviews admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to bulk update reviews',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get admin dashboard
   */
  static async getDashboard(req, res) {
    try {
      // Get basic dashboard stats
      const [
        totalUsers,
        activeUsers,
        totalResponses,
        totalQuestionnaires,
        recentAuditLogs,
      ] = await Promise.all([
        User.count(),
        User.count({ where: { is_active: true } }),
        Response.count(),
        Questionnaire.count(),
        AuditLog.findAll({
          limit: 10,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'first_name', 'last_name'],
            },
          ],
        }),
      ]);

      // Log admin action
      await AuditLog.create({
        user_id: req.userProfile.id,
        action: 'VIEW_DASHBOARD',
        resource_type: 'dashboard',
        resource_id: null,
        details: {},
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalUsers,
            activeUsers,
            totalResponses,
            totalQuestionnaires,
          },
          recentAuditLogs,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get dashboard admin controller error', {
        error: error.message,
        userId: req.userProfile?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
}

module.exports = AdminController;