'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const subscriptionValidation = require('../middleware/subscriptionValidation');
const AuthMiddleware = require('../middleware/auth');
const AdminAuth = require('../middleware/adminAuth');

// Apply authentication to all subscription routes
router.use(AuthMiddleware.authenticate);

// Apply upgrade prompt middleware to relevant routes
router.use(['/current', '/usage'], subscriptionValidation.addUpgradePrompt);

// Subscription management routes
router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/usage', subscriptionController.getUsage);
router.post('/upgrade-request', subscriptionController.requestUpgrade);
router.get('/plans', subscriptionController.getPlans);
router.get('/upgrade-suggestions', subscriptionController.getUpgradeSuggestions);
router.get('/payments', subscriptionController.getPaymentHistory);

// Admin routes (require admin authentication)
router.use('/requests', AdminAuth.requireAdmin); // All request management routes require admin
router.get('/requests/pending', subscriptionController.getPendingRequests);
router.get('/requests/:requestId', subscriptionController.getRequestById);
router.post('/requests/:requestId/process', subscriptionController.processRequest);
router.put('/manage', subscriptionController.manageSubscription);

module.exports = router;