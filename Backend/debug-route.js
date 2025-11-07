// Debug script to test route loading
const express = require('express');

try {
  console.log('Loading dependencies...');
  
  const EnterpriseAdminController = require('./src/controllers/enterpriseAdminController');
  console.log('✓ EnterpriseAdminController loaded');
  
  const EnterpriseAdminAuthController = require('./src/controllers/enterpriseAdminAuthController');
  console.log('✓ EnterpriseAdminAuthController loaded');
  
  const EnterpriseAdminAuthMiddleware = require('./src/middleware/enterpriseAdminAuth');
  console.log('✓ EnterpriseAdminAuthMiddleware loaded');
  console.log('  - checkAccountLockout:', typeof EnterpriseAdminAuthMiddleware.checkAccountLockout);
  console.log('  - strictRateLimit:', typeof EnterpriseAdminAuthMiddleware.strictRateLimit);
  
  const { validateInput } = require('./src/middleware/security');
  console.log('✓ Security middleware loaded');
  console.log('  - validateInput:', typeof validateInput);
  
  const enterpriseAdminService = require('./src/services/enterpriseAdminService');
  console.log('✓ Enterprise admin service loaded');
  
  console.log('Creating router...');
  const router = express.Router();
  
  console.log('Defining route...');
  router.post('/auth/login', 
    validateInput,
    EnterpriseAdminAuthMiddleware.checkAccountLockout,
    EnterpriseAdminAuthMiddleware.strictRateLimit({ max: 5 }),
    EnterpriseAdminAuthController.adminLogin
  );
  
  console.log('✓ Route defined successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}