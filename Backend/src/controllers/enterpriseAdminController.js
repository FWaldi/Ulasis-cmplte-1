'use strict';

const enterpriseAdminService = require('../services/enterpriseAdminService');
const { User, AdminRole, AdminUser, AdminActivity, EnterpriseReport } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Enhanced Enterprise Admin Controller
 */
class EnterpriseAdminController {
  /**
   * Get enterprise admin dashboard
   */
  static async getEnterpriseDashboard(req, res) {
    try {
      const dashboardStats = await enterpriseAdminService.getDashboardStats();

      // Get additional system metrics
      const [
        totalUsers,
        activeUsers,
        totalSubscriptions,
        pendingRequests,
        recentActivities,
      ] = await Promise.all([
        User.count(),
        User.count({ where: { is_active: true } }),
        User.count({ where: { subscription_plan: { [Op.ne]: 'free' } } }),
        User.count({ where: { subscription_status: 'pending' } }),
        AdminActivity.findAll({
          limit: 10,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: AdminUser,
              as: 'adminUser',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'email', 'first_name', 'last_name'],
                },
              ],
            },
          ],
        }),
      ]);

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'VIEW_ENTERPRISE_DASHBOARD',
        'dashboard',
        null,
        { section: 'overview' },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        success: true,
        data: {
          admin_stats: dashboardStats.data,
          system_stats: {
            total_users: totalUsers,
            active_users: activeUsers,
            total_subscriptions: totalSubscriptions,
            pending_requests: pendingRequests,
          },
          recent_activities: recentActivities,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get enterprise dashboard error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve enterprise dashboard',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get all admin users with enhanced details
   */
  static async getAdminUsers(req, res) {
    try {
      const result = await enterpriseAdminService.getAdminUsers(req.query);

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'VIEW_ADMIN_USERS',
        'admin_user',
        null,
        { filters: req.query, count: result.data.admin_users.length },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get admin users error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin users',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Create new admin user
   */
  static async createAdminUser(req, res) {
    try {
      const { userId, roleId, department, customPermissions } = req.body;

      // Check permission
      const hasPermission = await enterpriseAdminService.checkPermission(
        req.adminUser.id,
        'admin_management',
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have permission to manage admin users',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const result = await enterpriseAdminService.createAdminUser({
        userId,
        roleId,
        department,
        customPermissions,
      });

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'CREATE_ADMIN_USER',
        'admin_user',
        result.data.id,
        { userId, roleId, department },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Create admin user error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create admin user',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Update admin user
   */
  static async updateAdminUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check permission
      const hasPermission = await enterpriseAdminService.checkPermission(
        req.adminUser.id,
        'admin_management',
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have permission to manage admin users',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const result = await enterpriseAdminService.updateAdminUser(id, updateData);

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'UPDATE_ADMIN_USER',
        'admin_user',
        id,
        updateData,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Update admin user error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        targetUserId: req.params.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update admin user',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get admin activities with enhanced filtering
   */
  static async getAdminActivities(req, res) {
    try {
      const result = await enterpriseAdminService.getAdminActivities(req.query);

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'VIEW_ADMIN_ACTIVITIES',
        'admin_activity',
        null,
        { filters: req.query, count: result.data.activities.length },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get admin activities error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin activities',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get admin roles
   */
  static async getAdminRoles(req, res) {
    try {
      const roles = await AdminRole.findAll({
        where: { is_active: true },
        order: [['level', 'DESC']],
      });

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'VIEW_ADMIN_ROLES',
        'admin_role',
        null,
        { count: roles.length },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        success: true,
        data: { roles },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get admin roles error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin roles',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Bulk user operations
   */
  static async bulkUserOperations(req, res) {
    try {
      const { operation, userIds, updateData } = req.body;

      // Check permission
      const hasPermission = await enterpriseAdminService.checkPermission(
        req.adminUser.id,
        'user_management',
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have permission to perform bulk user operations',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const results = [];
      const startTime = Date.now();

      for (const userId of userIds) {
        try {
          const user = await User.findByPk(userId);
          if (!user) {
            results.push({ id: userId, success: false, error: 'User not found' });
            continue;
          }

          switch (operation) {
            case 'activate':
              await user.update({ is_active: true, subscription_status: 'active' });
              results.push({ id: userId, success: true, action: 'activated' });
              break;

            case 'deactivate':
              await user.update({ is_active: false, subscription_status: 'suspended' });
              results.push({ id: userId, success: true, action: 'deactivated' });
              break;

            case 'update_subscription':
              await user.update(updateData);
              results.push({ id: userId, success: true, action: 'subscription_updated', data: updateData });
              break;

            case 'delete':
              await user.destroy();
              results.push({ id: userId, success: true, action: 'deleted' });
              break;

            default:
              results.push({ id: userId, success: false, error: 'Invalid operation' });
          }
        } catch (error) {
          results.push({ id: userId, success: false, error: error.message });
        }
      }

      const duration = Date.now() - startTime;

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'BULK_USER_OPERATIONS',
        'user',
        null,
        { operation, userIds, results, success_count: results.filter(r => r.success).length },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          duration,
        },
      );

      res.status(200).json({
        success: true,
        message: `Bulk ${operation} completed`,
        data: {
          operation,
          processed: userIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
          duration_ms: duration,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Bulk user operations error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk user operations',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get enterprise analytics
   */
  static async getEnterpriseAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day',
        metrics = ['users', 'subscriptions', 'revenue', 'activities'],
      } = req.query;

      // Check permission
      const hasPermission = await enterpriseAdminService.checkPermission(
        req.adminUser.id,
        'analytics_view',
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have permission to view analytics',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const analytics = await this.generateEnterpriseAnalytics({
        startDate,
        endDate,
        groupBy,
        metrics,
      });

      // Log activity
      await enterpriseAdminService.logActivity(
        req.adminUser.id,
        'VIEW_ENTERPRISE_ANALYTICS',
        'analytics',
        null,
        { startDate, endDate, groupBy, metrics },
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
        },
      );

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get enterprise analytics error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve enterprise analytics',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Generate enterprise analytics data
   */
  static async generateEnterpriseAnalytics(params) {
    const { startDate, endDate, groupBy, metrics } = params;
    const where = {};

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const analytics = {};

    if (metrics.includes('users')) {
      analytics.user_growth = await User.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: startDate || endDate ? { created_at: where.created_at } : {},
        group: [sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      });
    }

    if (metrics.includes('subscriptions')) {
      analytics.subscription_distribution = await User.findAll({
        attributes: [
          'subscription_plan',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['subscription_plan'],
      });
    }

    if (metrics.includes('activities')) {
      analytics.activity_trends = await AdminActivity.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          'action',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: startDate || endDate ? { created_at: where.created_at } : {},
        group: [sequelize.fn('DATE', sequelize.col('created_at')), 'action'],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      });
    }

    return analytics;
  }
}

module.exports = EnterpriseAdminController;