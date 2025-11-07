'use strict';

const express = require('express');
const AdminController = require('../controllers/adminController');
const AdminAuthMiddleware = require('../middleware/adminAuth');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(AuthMiddleware.authenticate);
router.use(AdminAuthMiddleware.requireAdmin);
router.use(AdminAuthMiddleware.adminRateLimit());

// Admin dashboard
router.get(
  '/dashboard',
  AdminAuthMiddleware.logAdminAction('VIEW_DASHBOARD'),
  AdminController.getDashboard,
);

// User management routes
router.get(
  '/users',
  AdminAuthMiddleware.logAdminAction('VIEW_USERS'),
  AdminController.getUsers,
);

router.put(
  '/users/:id',
  AdminAuthMiddleware.logAdminAction('UPDATE_USER'),
  AdminController.updateUser,
);

router.post(
  '/users/:id/toggle-status',
  AdminAuthMiddleware.logAdminAction('TOGGLE_USER_STATUS'),
  AdminController.toggleUserStatus,
);

router.put(
  '/users/:id/subscription',
  AdminAuthMiddleware.logAdminAction('UPDATE_USER_SUBSCRIPTION'),
  AdminController.updateUserSubscription,
);

// Audit logs
router.get(
  '/audit-logs',
  AdminAuthMiddleware.logAdminAction('VIEW_AUDIT_LOGS'),
  AdminController.getAuditLogs,
);

// System monitoring
router.get(
  '/system/health',
  AdminAuthMiddleware.logAdminAction('VIEW_SYSTEM_HEALTH'),
  AdminController.getSystemHealth,
);

router.get(
  '/system/metrics',
  AdminAuthMiddleware.logAdminAction('VIEW_SYSTEM_METRICS'),
  AdminController.getSystemMetrics,
);

// Backup management
router.post(
  '/backup',
  AdminAuthMiddleware.logAdminAction('CREATE_BACKUP'),
  AdminController.createBackup,
);

router.get(
  '/backups',
  AdminAuthMiddleware.logAdminAction('VIEW_BACKUPS'),
  AdminController.getBackups,
);

router.post(
  '/backup/:backupName/restore',
  AdminAuthMiddleware.logAdminAction('RESTORE_BACKUP'),
  AdminController.restoreBackup,
);

// Content moderation routes
router.get(
  '/reviews',
  AdminAuthMiddleware.logAdminAction('VIEW_REVIEWS'),
  AdminController.getReviews,
);

router.put(
  '/reviews/:id',
  AdminAuthMiddleware.logAdminAction('UPDATE_REVIEW'),
  AdminController.updateReview,
);

router.post(
  '/reviews/bulk-update',
  AdminAuthMiddleware.logAdminAction('BULK_UPDATE_REVIEWS'),
  AdminController.bulkUpdateReviews,
);

module.exports = router;