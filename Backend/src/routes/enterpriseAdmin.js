'use strict';

const express = require('express');
const EnterpriseAdminController = require('../controllers/enterpriseAdminController');
const EnterpriseAdminAuthController = require('../controllers/enterpriseAdminAuthController');
const EnterpriseAdminAuthMiddleware = require('../middleware/enterpriseAdminAuth');
const { validateInput } = require('../middleware/security');
const enterpriseAdminService = require('../services/enterpriseAdminService');

const router = express.Router();

// Public authentication routes (no auth required)
router.post('/auth/login',
  validateInput, // Input validation before authentication
  EnterpriseAdminAuthMiddleware.checkAccountLockout,
  EnterpriseAdminAuthMiddleware.strictRateLimit({ max: 5 }), // Very strict for login
  EnterpriseAdminAuthController.adminLogin,
);

// Authenticated routes (require valid session)
router.use('/auth', EnterpriseAdminAuthMiddleware.authenticate);

router.post('/auth/logout',
  EnterpriseAdminAuthMiddleware.logAdminAction('ADMIN_LOGOUT'),
  EnterpriseAdminAuthController.adminLogout,
);

router.post('/auth/refresh',
  EnterpriseAdminAuthMiddleware.logAdminAction('TOKEN_REFRESH'),
  EnterpriseAdminAuthController.refreshToken,
);

router.post('/auth/change-password',
  EnterpriseAdminAuthMiddleware.logAdminAction('CHANGE_PASSWORD'),
  EnterpriseAdminAuthController.changePassword,
);

router.get('/auth/session',
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_SESSION'),
  EnterpriseAdminAuthController.getSessionInfo,
);

// 2FA management routes
router.post('/auth/2fa/setup',
  EnterpriseAdminAuthMiddleware.requirePermission('security_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('SETUP_2FA'),
  EnterpriseAdminAuthController.setupTwoFactor,
);

router.post('/auth/2fa/verify',
  EnterpriseAdminAuthMiddleware.requirePermission('security_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VERIFY_2FA'),
  EnterpriseAdminAuthController.verifyAndEnableTwoFactor,
);

router.post('/auth/2fa/disable',
  EnterpriseAdminAuthMiddleware.requirePermission('security_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('DISABLE_2FA'),
  EnterpriseAdminAuthController.disableTwoFactor,
);

// Apply authentication middleware to all remaining routes
router.use(EnterpriseAdminAuthMiddleware.authenticate);

// Apply general admin rate limiting to all authenticated routes
router.use(EnterpriseAdminAuthMiddleware.adminRateLimit());

// Enterprise Dashboard Routes
router.get('/dashboard',
  EnterpriseAdminAuthMiddleware.requirePermission('dashboard_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_ENTERPRISE_DASHBOARD'),
  EnterpriseAdminController.getEnterpriseDashboard,
);

// Admin User Management Routes
router.get('/admin-users',
  EnterpriseAdminAuthMiddleware.requirePermission('admin_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_ADMIN_USERS'),
  EnterpriseAdminController.getAdminUsers,
);

router.post('/admin-users',
  EnterpriseAdminAuthMiddleware.requirePermission('admin_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('CREATE_ADMIN_USER'),
  EnterpriseAdminController.createAdminUser,
);

router.put('/admin-users/:id',
  EnterpriseAdminAuthMiddleware.requirePermission('admin_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('UPDATE_ADMIN_USER'),
  EnterpriseAdminController.updateAdminUser,
);

// Admin Roles Routes
router.get('/roles',
  EnterpriseAdminAuthMiddleware.requirePermission('admin_management'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_ADMIN_ROLES'),
  EnterpriseAdminController.getAdminRoles,
);

// Admin Activity Monitoring Routes
router.get('/activities',
  EnterpriseAdminAuthMiddleware.requirePermission('activity_monitoring'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_ADMIN_ACTIVITIES'),
  EnterpriseAdminController.getAdminActivities,
);

// User Management Routes
router.get('/users',
  EnterpriseAdminAuthMiddleware.requirePermission('user_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_USERS'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, status, subscriptionPlan, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      const { User } = require('../models');
      const { Op } = require('sequelize');

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

      if (status) {
        where.is_active = status === 'active';
      }

      if (subscriptionPlan) {
        where.subscription_plan = subscriptionPlan;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: [
          'id', 'email', 'first_name', 'last_name', 'is_active',
          'subscription_plan', 'subscription_status', 'created_at', 'last_login',
        ],
      });

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
      const logger = require('../utils/logger');
      logger.error('Get users error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

router.post('/users/bulk-operations',
  EnterpriseAdminAuthMiddleware.requirePermission('user_management'),
  EnterpriseAdminAuthMiddleware.strictRateLimit({ max: 3 }), // Very strict for bulk operations
  EnterpriseAdminAuthMiddleware.logAdminAction('BULK_USER_OPERATIONS'),
  EnterpriseAdminController.bulkUserOperations,
);

// Enterprise Analytics Routes
router.get('/analytics',
  EnterpriseAdminAuthMiddleware.requirePermission('analytics_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_ENTERPRISE_ANALYTICS'),
  EnterpriseAdminController.getEnterpriseAnalytics,
);

// Advanced Analytics Routes
router.get('/analytics/user-growth',
  EnterpriseAdminAuthMiddleware.requirePermission('analytics_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_USER_GROWTH_ANALYTICS'),
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const { User, sequelize } = require('../models');
      const { Op } = require('sequelize');

      const where = {};
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      const groupByClause = groupBy === 'month'
        ? sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at'))
        : sequelize.fn('DATE', sequelize.col('created_at'));

      const userGrowth = await User.findAll({
        attributes: [
          [groupByClause, 'period'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'new_users'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_active = true THEN 1 END')), 'active_users'],
        ],
        where,
        group: [groupByClause],
        order: [[groupByClause, 'ASC']],
      });

      res.status(200).json({
        success: true,
        data: {
          user_growth: userGrowth,
          filters: { startDate, endDate, groupBy },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Get user growth analytics error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user growth analytics',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

router.get('/analytics/subscription-revenue',
  EnterpriseAdminAuthMiddleware.requirePermission('analytics_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_SUBSCRIPTION_REVENUE_ANALYTICS'),
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;
      const { User, sequelize } = require('../models');
      const { Op } = require('sequelize');

      const where = {};
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      const groupByClause = groupBy === 'year'
        ? sequelize.fn('DATE_TRUNC', 'year', sequelize.col('created_at'))
        : sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at'));

      // Subscription revenue analytics
      const subscriptionRevenue = await User.findAll({
        attributes: [
          [groupByClause, 'period'],
          'subscription_plan',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.literal('COUNT(*) * CASE subscription_plan WHEN \'basic\' THEN 9.99 WHEN \'premium\' THEN 29.99 WHEN \'enterprise\' THEN 99.99 ELSE 0 END'), 'revenue'],
        ],
        where: {
          ...where,
          subscription_plan: { [Op.ne]: 'free' },
        },
        group: [groupByClause, 'subscription_plan'],
        order: [[groupByClause, 'ASC']],
      });

      // Overall subscription distribution
      const subscriptionDistribution = await User.findAll({
        attributes: [
          'subscription_plan',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.literal('COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users)'), 'percentage'],
        ],
        group: ['subscription_plan'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          subscription_revenue: subscriptionRevenue,
          subscription_distribution: subscriptionDistribution,
          filters: { startDate, endDate, groupBy },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Get subscription revenue analytics error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscription revenue analytics',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

// Security Monitoring Routes
router.get('/security/threats',
  EnterpriseAdminAuthMiddleware.requireRoleLevel(80), // Admin level and above
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_SECURITY_THREATS'),
  async (req, res) => {
    try {
      const { startDate, endDate, severity = 'all' } = req.query;
      const { AdminActivity, sequelize } = require('../models');
      const { Op } = require('sequelize');

      const where = {
        status: 'failure',
      };

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      // Get failed login attempts and other security events
      const securityThreats = await AdminActivity.findAll({
        where,
        include: [
          {
            model: require('../models').AdminUser,
            as: 'adminUser',
            include: [
              {
                model: require('../models').User,
                as: 'user',
                attributes: ['id', 'email'],
              },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 100,
      });

      // Group threats by type and IP
      const threatAnalysis = await AdminActivity.findAll({
        attributes: [
          'action',
          'ip_address',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('MAX', sequelize.col('created_at')), 'last_occurrence'],
        ],
        where,
        group: ['action', 'ip_address'],
        having: sequelize.literal('COUNT(*) > 3'), // More than 3 failures
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          security_threats: securityThreats,
          threat_analysis: threatAnalysis,
          filters: { startDate, endDate, severity },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Get security threats error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security threats',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

// Report Generation Routes
router.post('/reports/generate',
  EnterpriseAdminAuthMiddleware.requirePermission('reports_generate'),
  EnterpriseAdminAuthMiddleware.strictRateLimit({ max: 2 }), // Very strict for report generation
  EnterpriseAdminAuthMiddleware.logAdminAction('GENERATE_REPORT'),
  async (req, res) => {
    try {
      const { type, parameters, format = 'json', schedule } = req.body;
      const { EnterpriseReport } = require('../models');

      const report = await EnterpriseReport.create({
        name: `${type}_${Date.now()}`,
        type,
        description: `Generated ${type} report`,
        parameters,
        schedule,
        format,
        status: 'running',
        created_by: req.adminUser.id,
      });

      // Start report generation in background
      // This would typically be handled by a background job queue
      setImmediate(async () => {
        try {
          // Generate report based on type
          let reportData;
          switch (type) {
            case 'user_analytics':
              reportData = await generateUserAnalyticsReport(parameters);
              break;
            case 'subscription_revenue':
              reportData = await generateSubscriptionRevenueReport(parameters);
              break;
            case 'security_audit':
              reportData = await generateSecurityAuditReport(parameters);
              break;
            default:
              throw new Error(`Unknown report type: ${type}`);
          }

          // Save report data to file
          const fs = require('fs').promises;
          const path = require('path');
          const reportsDir = path.join(__dirname, '../../reports');

          await fs.mkdir(reportsDir, { recursive: true });

          const fileName = `report_${report.id}.${format}`;
          const filePath = path.join(reportsDir, fileName);

          if (format === 'json') {
            await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
          } else if (format === 'csv') {
            // Convert to CSV format
            const csv = convertToCSV(reportData);
            await fs.writeFile(filePath, csv);
          }

          // Update report status
          const stats = await fs.stat(filePath);
          await EnterpriseReport.update(
            {
              status: 'completed',
              file_path: filePath,
              file_size: stats.size,
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
            { where: { id: report.id } },
          );

        } catch (error) {
          await EnterpriseReport.update(
            {
              status: 'failed',
              error_message: error.message,
            },
            { where: { id: report.id } },
          );
        }
      });

      res.status(202).json({
        success: true,
        message: 'Report generation started',
        data: {
          reportId: report.id,
          estimatedTime: '2-5 minutes',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Generate report error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

router.get('/reports',
  EnterpriseAdminAuthMiddleware.requirePermission('reports_view'),
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, type } = req.query;
      const { EnterpriseReport } = require('../models');
      const { Op } = require('sequelize');

      const offset = (page - 1) * limit;
      const where = {};

      if (status) where.status = status;
      if (type) where.type = type;

      const { count, rows: reports } = await EnterpriseReport.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: require('../models').AdminUser,
            as: 'creator',
            include: [
              {
                model: require('../models').User,
                as: 'user',
                attributes: ['id', 'email', 'first_name', 'last_name'],
              },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          reports,
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
      const logger = require('../utils/logger');
      logger.error('Get reports error', { error: error.message, requestId: req.requestId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reports',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  },
);

// Helper functions for report generation
async function generateUserAnalyticsReport(parameters) {
  const { User } = require('../models');
  const { Op } = require('sequelize');

  const { startDate, endDate } = parameters;
  const where = {};

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[Op.gte] = new Date(startDate);
    if (endDate) where.created_at[Op.lte] = new Date(endDate);
  }

  const users = await User.findAll({ where });

  return {
    summary: {
      total_users: users.length,
      active_users: users.filter(u => u.is_active).length,
      subscription_breakdown: users.reduce((acc, user) => {
        acc[user.subscription_plan] = (acc[user.subscription_plan] || 0) + 1;
        return acc;
      }, {}),
    },
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      is_active: u.is_active,
      subscription_plan: u.subscription_plan,
      created_at: u.created_at,
    })),
  };
}

async function generateSubscriptionRevenueReport(parameters) {
  // Implementation for subscription revenue report
  return { message: 'Subscription revenue report data' };
}

async function generateSecurityAuditReport(parameters) {
  // Implementation for security audit report
  return { message: 'Security audit report data' };
}

function convertToCSV(data) {
  // Simple CSV conversion - would need to be more sophisticated for nested data
  return 'CSV data conversion placeholder';
}

// Backward compatibility routes for tests
// These routes map old endpoints to new auth endpoints
router.post('/login',
  EnterpriseAdminAuthMiddleware.checkAccountLockout,
  EnterpriseAdminAuthMiddleware.strictRateLimit({ max: 5 }),
  EnterpriseAdminAuthController.adminLogin,
);

router.get('/session',
  EnterpriseAdminAuthMiddleware.logAdminAction('VIEW_SESSION'),
  EnterpriseAdminAuthController.getSessionInfo,
);

router.post('/logout',
  EnterpriseAdminAuthMiddleware.logAdminAction('ADMIN_LOGOUT'),
  EnterpriseAdminAuthController.adminLogout,
);

module.exports = router;