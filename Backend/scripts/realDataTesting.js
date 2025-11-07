#!/usr/bin/env node

/**
 * Enterprise Admin Real Data Testing Script
 * 
 * This script tests enterprise admin features with realistic data scenarios
 * to ensure the system performs well under real-world conditions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { faker } = require('@faker-js/faker');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1/enterprise-admin';
const TEST_DATA_SIZE = parseInt(process.env.TEST_DATA_SIZE) || 1000;
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 10;

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSubsection(title) {
  log(`\n--- ${title} ---`, 'yellow');
}

// Test data generators
class TestDataGenerator {
  static generateUser() {
    return {
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: faker.internet.password(12, true, /[A-Z]/),
      phone: faker.phone.phoneNumber(),
      company: faker.company.companyName(),
      subscriptionPlan: faker.random.arrayElement(['basic', 'business', 'enterprise']),
      isActive: faker.datatype.boolean(0.9), // 90% active
      profile: {
        avatar: faker.internet.avatar(),
        bio: faker.lorem.paragraph(),
        website: faker.internet.url(),
        location: faker.address.city() + ', ' + faker.address.country(),
      },
      statistics: {
        totalLogins: faker.datatype.number({ min: 1, max: 500 }),
        lastLogin: faker.date.recent(30),
        averageSessionDuration: faker.datatype.number({ min: 60, max: 3600 }),
        totalResponses: faker.datatype.number({ min: 0, max: 100 }),
      },
    };
  }

  static generateActivityLog(userId) {
    const activities = [
      'login', 'logout', 'profile_update', 'password_change',
      'subscription_upgrade', 'subscription_downgrade', 'api_access',
      'data_export', 'report_generation', 'settings_change'
    ];
    
    return {
      userId,
      type: faker.random.arrayElement(activities),
      description: faker.lorem.sentence(),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      timestamp: faker.date.recent(90),
      severity: faker.random.arrayElement(['info', 'warning', 'error']),
    };
  }

  static generateSecurityIncident() {
    const incidentTypes = [
      'failed_login', 'suspicious_activity', 'data_access',
      'privilege_escalation', 'unauthorized_access', 'malware_detected'
    ];
    
    return {
      type: faker.random.arrayElement(incidentTypes),
      severity: faker.random.arrayElement(['low', 'medium', 'high', 'critical']),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      status: faker.random.arrayElement(['open', 'investigating', 'resolved']),
      createdAt: faker.date.recent(30),
      resolvedAt: faker.datatype.boolean(0.3) ? faker.date.recent(7) : null,
    };
  }

  static generateAnalyticsData() {
    return {
      date: faker.date.recent(365),
      users: {
        total: faker.datatype.number({ min: 1000, max: 10000 }),
        active: faker.datatype.number({ min: 500, max: 8000 }),
        new: faker.datatype.number({ min: 10, max: 200 }),
        retention: faker.datatype.float({ min: 60, max: 95, precision: 0.1 }),
      },
      sessions: {
        total: faker.datatype.number({ min: 5000, max: 50000 }),
        averageDuration: faker.datatype.number({ min: 120, max: 1800 }),
        bounceRate: faker.datatype.float({ min: 20, max: 60, precision: 0.1 }),
      },
      performance: {
        averageResponseTime: faker.datatype.number({ min: 50, max: 500 }),
        uptime: faker.datatype.float({ min: 95, max: 99.9, precision: 0.1 }),
        errorRate: faker.datatype.float({ min: 0.1, max: 5, precision: 0.1 }),
      },
      business: {
        revenue: faker.datatype.number({ min: 1000, max: 100000 }),
        subscriptions: {
          basic: faker.datatype.number({ min: 100, max: 1000 }),
          business: faker.datatype.number({ min: 50, max: 500 }),
          enterprise: faker.datatype.number({ min: 10, max: 100 }),
        },
      },
    };
  }
}

// API client for testing
class EnterpriseAdminAPIClient {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor if token is provided
    if (token) {
      this.axios.interceptors.request.use(config => {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });
    }
  }

  async login(email, password) {
    try {
      const response = await this.axios.post('/login', { email, password });
      this.token = response.data.data.token;
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getUsers(params = {}) {
    try {
      const response = await this.axios.get('/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Get users failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createUser(userData) {
    try {
      const response = await this.axios.post('/users', userData);
      return response.data;
    } catch (error) {
      throw new Error(`Create user failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await this.axios.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(`Update user failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      const response = await this.axios.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Delete user failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async bulkUserOperation(action, userIds, filters = {}) {
    try {
      const response = await this.axios.post('/users/bulk', {
        action,
        userIds,
        filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Bulk operation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getDashboard(timeRange = '30d') {
    try {
      const response = await this.axios.get('/dashboard', { params: { timeRange } });
      return response.data;
    } catch (error) {
      throw new Error(`Get dashboard failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAnalytics(type = 'overview', params = {}) {
    try {
      const response = await this.axios.get(`/analytics/${type}`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Get analytics failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSecurityIncidents(params = {}) {
    try {
      const response = await this.axios.get('/security/incidents', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Get security incidents failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSystemHealth() {
    try {
      const response = await this.axios.get('/system/health');
      return response.data;
    } catch (error) {
      throw new Error(`Get system health failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test scenarios
class RealDataTestScenarios {
  constructor() {
    this.client = new EnterpriseAdminAPIClient(API_BASE_URL);
    this.testResults = [];
  }

  async runAllTests() {
    logSection('Enterprise Admin Real Data Testing');
    log(`Testing with ${TEST_DATA_SIZE} records and ${CONCURRENT_USERS} concurrent users`, 'blue');

    try {
      await this.testAuthenticationFlow();
      await this.testUserManagementWithRealData();
      await this.testBulkOperations();
      await this.testAnalyticsWithRealData();
      await this.testSecurityMonitoring();
      await this.testPerformanceUnderLoad();
      await this.testDataIntegrity();
      await this.testConcurrentAccess();
      
      this.generateTestReport();
    } catch (error) {
      log(`❌ Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async testAuthenticationFlow() {
    logSubsection('Authentication Flow Testing');
    
    const startTime = Date.now();
    
    try {
      // Test login with various scenarios
      const loginTests = [
        { email: 'admin@example.com', password: 'password123', expected: 'success' },
        { email: 'admin@example.com', password: 'wrongpassword', expected: 'failure' },
        { email: 'nonexistent@example.com', password: 'password123', expected: 'failure' },
        { email: '', password: 'password123', expected: 'failure' },
        { email: 'admin@example.com', password: '', expected: 'failure' },
      ];

      for (const test of loginTests) {
        try {
          const result = await this.client.login(test.email, test.password);
          const success = (test.expected === 'success' && result.success) ||
                        (test.expected === 'failure' && !result.success);
          
          this.testResults.push({
            test: `Login with ${test.email || 'empty email'}`,
            success,
            duration: Date.now() - startTime,
            details: result.message || 'Failed as expected',
          });
          
          log(`  ${success ? '✅' : '❌'} Login test: ${test.email || 'empty email'}`, success ? 'green' : 'red');
        } catch (error) {
          const success = test.expected === 'failure';
          this.testResults.push({
            test: `Login with ${test.email || 'empty email'}`,
            success,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`  ${success ? '✅' : '❌'} Login test: ${test.email || 'empty email'}`, success ? 'green' : 'red');
        }
      }
      
      log(`✅ Authentication flow testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Authentication flow testing failed: ${error.message}`, 'red');
    }
  }

  async testUserManagementWithRealData() {
    logSubsection('User Management with Real Data');
    
    const startTime = Date.now();
    const createdUsers = [];
    
    try {
      // Login first
      await this.client.login('admin@example.com', 'password123');
      
      // Create users with realistic data
      log(`  Creating ${TEST_DATA_SIZE} users with realistic data...`, 'blue');
      
      for (let i = 0; i < Math.min(TEST_DATA_SIZE, 100); i++) { // Limit for demo
        const userData = TestDataGenerator.generateUser();
        
        try {
          const result = await this.client.createUser(userData);
          createdUsers.push({ id: result.data.user.id, ...userData });
          
          if ((i + 1) % 10 === 0) {
            log(`    Created ${i + 1} users...`, 'blue');
          }
        } catch (error) {
          this.testResults.push({
            test: `Create user ${i + 1}`,
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
        }
      }
      
      // Test user retrieval with pagination
      log('  Testing user pagination and search...', 'blue');
      
      const paginationTests = [
        { page: 1, limit: 20 },
        { page: 2, limit: 50 },
        { page: 1, limit: 100, search: 'john' },
        { page: 1, limit: 20, status: 'active' },
        { page: 1, limit: 20, subscription: 'business' },
      ];
      
      for (const params of paginationTests) {
        try {
          const result = await this.client.getUsers(params);
          this.testResults.push({
            test: `Get users with params ${JSON.stringify(params)}`,
            success: result.success,
            duration: Date.now() - startTime,
            details: `Found ${result.data.pagination.total} users`,
          });
          
          log(`    ✅ Pagination test: ${JSON.stringify(params)}`, 'green');
        } catch (error) {
          this.testResults.push({
            test: `Get users with params ${JSON.stringify(params)}`,
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`    ❌ Pagination test failed: ${error.message}`, 'red');
        }
      }
      
      // Test user updates
      if (createdUsers.length > 0) {
        log('  Testing user updates...', 'blue');
        
        const testUser = createdUsers[0];
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          isActive: false,
        };
        
        try {
          const result = await this.client.updateUser(testUser.id, updateData);
          this.testResults.push({
            test: 'Update user',
            success: result.success,
            duration: Date.now() - startTime,
            details: result.message,
          });
          
          log('    ✅ User update test passed', 'green');
        } catch (error) {
          this.testResults.push({
            test: 'Update user',
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`    ❌ User update test failed: ${error.message}`, 'red');
        }
      }
      
      log(`✅ User management testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ User management testing failed: ${error.message}`, 'red');
    }
  }

  async testBulkOperations() {
    logSubsection('Bulk Operations Testing');
    
    const startTime = Date.now();
    
    try {
      // Test bulk user operations
      const bulkOperations = [
        { action: 'export', filters: { status: 'active' } },
        { action: 'deactivate', filters: { subscription: 'basic' } },
        { action: 'activate', filters: { status: 'inactive' } },
      ];
      
      for (const operation of bulkOperations) {
        try {
          const result = await this.client.bulkUserOperation(operation.action, [], operation.filters);
          this.testResults.push({
            test: `Bulk operation: ${operation.action}`,
            success: result.success,
            duration: Date.now() - startTime,
            details: `Processed ${result.data.processed} items`,
          });
          
          log(`  ✅ Bulk ${operation.action} completed`, 'green');
        } catch (error) {
          this.testResults.push({
            test: `Bulk operation: ${operation.action}`,
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`  ❌ Bulk ${operation.action} failed: ${error.message}`, 'red');
        }
      }
      
      log(`✅ Bulk operations testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Bulk operations testing failed: ${error.message}`, 'red');
    }
  }

  async testAnalyticsWithRealData() {
    logSubsection('Analytics with Real Data');
    
    const startTime = Date.now();
    
    try {
      // Test various analytics endpoints
      const analyticsTests = [
        { type: 'overview', params: { dateRange: '30d' } },
        { type: 'users', params: { dateRange: '90d', groupBy: 'month' } },
        { type: 'performance', params: { dateRange: '7d' } },
      ];
      
      for (const test of analyticsTests) {
        try {
          const result = await this.client.getAnalytics(test.type, test.params);
          this.testResults.push({
            test: `Analytics ${test.type}`,
            success: result.success,
            duration: Date.now() - startTime,
            details: `Retrieved analytics data`,
          });
          
          log(`  ✅ Analytics ${test.type} test passed`, 'green');
        } catch (error) {
          this.testResults.push({
            test: `Analytics ${test.type}`,
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`  ❌ Analytics ${test.type} test failed: ${error.message}`, 'red');
        }
      }
      
      // Test dashboard data
      try {
        const result = await this.client.getDashboard('30d');
        this.testResults.push({
          test: 'Dashboard data',
          success: result.success,
          duration: Date.now() - startTime,
          details: 'Dashboard data retrieved successfully',
        });
        
        log('  ✅ Dashboard data test passed', 'green');
      } catch (error) {
        this.testResults.push({
          test: 'Dashboard data',
          success: false,
          duration: Date.now() - startTime,
          details: error.message,
        });
        
        log(`  ❌ Dashboard data test failed: ${error.message}`, 'red');
      }
      
      log(`✅ Analytics testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Analytics testing failed: ${error.message}`, 'red');
    }
  }

  async testSecurityMonitoring() {
    logSubsection('Security Monitoring Testing');
    
    const startTime = Date.now();
    
    try {
      // Test security incidents retrieval
      const securityTests = [
        { params: { status: 'open' } },
        { params: { severity: 'high' } },
        { params: { status: 'all' } },
      ];
      
      for (const params of securityTests) {
        try {
          const result = await this.client.getSecurityIncidents(params);
          this.testResults.push({
            test: `Security incidents with params ${JSON.stringify(params)}`,
            success: result.success,
            duration: Date.now() - startTime,
            details: `Found ${result.data.incidents?.length || 0} incidents`,
          });
          
          log(`  ✅ Security incidents test passed`, 'green');
        } catch (error) {
          this.testResults.push({
            test: `Security incidents with params ${JSON.stringify(params)}`,
            success: false,
            duration: Date.now() - startTime,
            details: error.message,
          });
          
          log(`  ❌ Security incidents test failed: ${error.message}`, 'red');
        }
      }
      
      // Test system health
      try {
        const result = await this.client.getSystemHealth();
        this.testResults.push({
          test: 'System health',
          success: result.success,
          duration: Date.now() - startTime,
          details: `System status: ${result.data.status}`,
        });
        
        log(`  ✅ System health: ${result.data.status}`, 'green');
      } catch (error) {
        this.testResults.push({
          test: 'System health',
          success: false,
          duration: Date.now() - startTime,
          details: error.message,
        });
        
        log(`  ❌ System health test failed: ${error.message}`, 'red');
      }
      
      log(`✅ Security monitoring testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Security monitoring testing failed: ${error.message}`, 'red');
    }
  }

  async testPerformanceUnderLoad() {
    logSubsection('Performance Under Load Testing');
    
    const startTime = Date.now();
    
    try {
      // Simulate concurrent users
      const concurrentPromises = [];
      
      for (let i = 0; i < CONCURRENT_USERS; i++) {
        const client = new EnterpriseAdminAPIClient(API_BASE_URL);
        
        const promise = (async () => {
          try {
            // Login
            await client.login('admin@example.com', 'password123');
            
            // Perform various operations
            await client.getUsers({ page: 1, limit: 20 });
            await client.getDashboard('7d');
            await client.getAnalytics('overview');
            
            return { success: true, userId: i };
          } catch (error) {
            return { success: false, userId: i, error: error.message };
          }
        })();
        
        concurrentPromises.push(promise);
      }
      
      const results = await Promise.all(concurrentPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      this.testResults.push({
        test: `Concurrent load test (${CONCURRENT_USERS} users)`,
        success: successful >= CONCURRENT_USERS * 0.8, // 80% success rate
        duration: Date.now() - startTime,
        details: `${successful} successful, ${failed} failed`,
      });
      
      log(`  📊 Load test results: ${successful} successful, ${failed} failed`, 'blue');
      log(`✅ Performance testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Performance testing failed: ${error.message}`, 'red');
    }
  }

  async testDataIntegrity() {
    logSubsection('Data Integrity Testing');
    
    const startTime = Date.now();
    
    try {
      // Test data consistency
      const userData = TestDataGenerator.generateUser();
      
      // Create user
      const createResult = await this.client.createUser(userData);
      const userId = createResult.data.user.id;
      
      // Retrieve user
      const getResult = await this.client.getUsers({ search: userData.email });
      const retrievedUser = getResult.data.users.find(u => u.id === userId);
      
      // Verify data integrity
      const integrityChecks = [
        retrievedUser.email === userData.email,
        retrievedUser.firstName === userData.firstName,
        retrievedUser.lastName === userData.lastName,
        retrievedUser.isActive === userData.isActive,
      ];
      
      const allChecksPass = integrityChecks.every(check => check);
      
      this.testResults.push({
        test: 'Data integrity',
        success: allChecksPass,
        duration: Date.now() - startTime,
        details: `${integrityChecks.filter(c => c).length}/${integrityChecks.length} checks passed`,
      });
      
      // Clean up
      await this.client.deleteUser(userId);
      
      log(`  ${allChecksPass ? '✅' : '❌'} Data integrity: ${integrityChecks.filter(c => c).length}/${integrityChecks.length} checks passed`, 
          allChecksPass ? 'green' : 'red');
      
      log(`✅ Data integrity testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Data integrity testing failed: ${error.message}`, 'red');
    }
  }

  async testConcurrentAccess() {
    logSubsection('Concurrent Access Testing');
    
    const startTime = Date.now();
    
    try {
      // Test concurrent user creation
      const concurrentCreations = [];
      
      for (let i = 0; i < 10; i++) {
        const userData = TestDataGenerator.generateUser();
        userData.email = `concurrent${i}_${Date.now()}@example.com`;
        
        const promise = this.client.createUser(userData);
        concurrentCreations.push(promise);
      }
      
      const creationResults = await Promise.allSettled(concurrentCreations);
      const successful = creationResults.filter(r => r.status === 'fulfilled').length;
      const failed = creationResults.filter(r => r.status === 'rejected').length;
      
      this.testResults.push({
        test: 'Concurrent user creation',
        success: successful >= 8, // At least 80% success
        duration: Date.now() - startTime,
        details: `${successful} successful, ${failed} failed`,
      });
      
      log(`  📊 Concurrent creation: ${successful} successful, ${failed} failed`, 'blue');
      
      // Test concurrent updates
      if (successful > 0) {
        const userId = creationResults[0].value.data.user.id;
        const concurrentUpdates = [];
        
        for (let i = 0; i < 5; i++) {
          const updateData = {
            firstName: `Updated${i}`,
            lastName: `Name${i}`,
          };
          
          const promise = this.client.updateUser(userId, updateData);
          concurrentUpdates.push(promise);
        }
        
        const updateResults = await Promise.allSettled(concurrentUpdates);
        const updateSuccessful = updateResults.filter(r => r.status === 'fulfilled').length;
        const updateFailed = updateResults.filter(r => r.status === 'rejected').length;
        
        this.testResults.push({
          test: 'Concurrent user updates',
          success: updateSuccessful >= 1, // At least one should succeed
          duration: Date.now() - startTime,
          details: `${updateSuccessful} successful, ${updateFailed} failed`,
        });
        
        log(`  📊 Concurrent updates: ${updateSuccessful} successful, ${updateFailed} failed`, 'blue');
      }
      
      log(`✅ Concurrent access testing completed in ${Date.now() - startTime}ms`, 'green');
    } catch (error) {
      log(`❌ Concurrent access testing failed: ${error.message}`, 'red');
    }
  }

  generateTestReport() {
    logSection('Test Report Summary');
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    log(`Total Tests: ${totalTests}`, 'blue');
    log(`Successful: ${successfulTests}`, 'green');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log(`Total Duration: ${totalDuration}ms`, 'blue');
    log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`, 
        successfulTests === totalTests ? 'green' : 'yellow');
    
    if (failedTests > 0) {
      log('\nFailed Tests:', 'red');
      this.testResults.forEach((result, index) => {
        if (!result.success) {
          log(`  ${index + 1}. ${result.test}: ${result.details}`, 'red');
        }
      });
    }
    
    // Generate detailed report file
    const reportData = {
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        totalDuration,
        successRate: (successfulTests / totalTests) * 100,
        timestamp: new Date().toISOString(),
        testConfiguration: {
          testDataSize: TEST_DATA_SIZE,
          concurrentUsers: CONCURRENT_USERS,
          apiBaseURL: API_BASE_URL,
        },
      },
      results: this.testResults,
    };
    
    const reportPath = path.join(__dirname, '../reports', `enterprise-admin-real-data-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    log(`\n📊 Detailed report saved to: ${reportPath}`, 'cyan');
    
    // Performance metrics
    const avgDuration = totalDuration / totalTests;
    log(`\nPerformance Metrics:`, 'blue');
    log(`  Average test duration: ${avgDuration.toFixed(2)}ms`, 'blue');
    log(`  Fastest test: ${Math.min(...this.testResults.map(r => r.duration))}ms`, 'green');
    log(`  Slowest test: ${Math.max(...this.testResults.map(r => r.duration))}ms`, 'yellow');
    
    // Recommendations
    log(`\nRecommendations:`, 'magenta');
    if (failedTests === 0) {
      log('  ✅ All tests passed! System is ready for production.', 'green');
    } else {
      log('  ⚠️  Some tests failed. Review and fix issues before deployment.', 'yellow');
    }
    
    if (avgDuration > 5000) {
      log('  🐌 Consider optimizing slow operations.', 'yellow');
    }
    
    if (successfulTests / totalTests < 0.9) {
      log('  🔧 System stability needs improvement.', 'yellow');
    }
  }
}

// Main execution
async function main() {
  log('🧪 Enterprise Admin Real Data Testing', 'bright');
  log('Testing enterprise admin features with realistic data scenarios', 'blue');
  
  // Check dependencies
  try {
    require('axios');
    require('@faker-js/faker');
  } catch (error) {
    log('❌ Missing dependencies. Please install: npm install axios @faker-js/faker', 'red');
    process.exit(1);
  }
  
  // Create reports directory
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Run tests
  const testScenarios = new RealDataTestScenarios();
  await testScenarios.runAllTests();
  
  // Exit with appropriate code
  const failedTests = testScenarios.testResults.filter(r => !r.success).length;
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Enterprise Admin Real Data Testing', 'bright');
  log('\nUsage: node realDataTesting.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h              Show this help message', 'blue');
  log('  --data-size <number>    Number of test records to generate (default: 1000)', 'blue');
  log('  --concurrent <number>   Number of concurrent users (default: 10)', 'blue');
  log('  --api-url <url>         API base URL (default: http://localhost:3001/api/v1/enterprise-admin)', 'blue');
  log('\nExamples:', 'yellow');
  log('  node realDataTesting.js --data-size 5000 --concurrent 20', 'blue');
  log('  node realDataTesting.js --api-url https://api.example.com/api/v1/enterprise-admin', 'blue');
  process.exit(0);
}

// Parse command line arguments
if (args.includes('--data-size')) {
  const index = args.indexOf('--data-size');
  process.env.TEST_DATA_SIZE = args[index + 1];
}

if (args.includes('--concurrent')) {
  const index = args.indexOf('--concurrent');
  process.env.CONCURRENT_USERS = args[index + 1];
}

if (args.includes('--api-url')) {
  const index = args.indexOf('--api-url');
  process.env.API_BASE_URL = args[index + 1];
}

// Run main function
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});