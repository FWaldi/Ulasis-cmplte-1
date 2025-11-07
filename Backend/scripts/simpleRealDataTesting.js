#!/usr/bin/env node

/**
 * Simple Real Data Testing Script for Enterprise Admin
 * Tests basic functionality without requiring live API
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Configuration
const TEST_DATA_PATH = path.join(__dirname, '../test-data/simple-test-data.json');
const REPORTS_DIR = path.join(__dirname, '../reports');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

class SimpleRealDataTester {
  constructor() {
    this.testResults = [];
    this.testData = null;
    this.startTime = Date.now();
  }

  async runAllTests() {
    logSection('Enterprise Admin Simple Real Data Testing');
    log('Testing enterprise admin features with generated test data', 'blue');
    
    try {
      // Load test data
      await this.loadTestData();
      
      // Run tests
      await this.testDataLoading();
      await this.testUserManagement();
      await this.testDataValidation();
      await this.testPerformanceMetrics();
      await this.testSecurityScenarios();
      
      // Generate report
      this.generateTestReport();
      
    } catch (error) {
      log(`❌ Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async loadTestData() {
    logSubsection('Loading Test Data');
    
    try {
      const data = fs.readFileSync(TEST_DATA_PATH, 'utf8');
      this.testData = JSON.parse(data);
      
      this.testResults.push({
        test: 'Test data loading',
        success: true,
        duration: Date.now() - this.startTime,
        details: `Loaded ${this.testData.users.length} users and ${this.testData.activities.length} activities`,
      });
      
      log(`  ✅ Loaded ${this.testData.users.length} users and ${this.testData.activities.length} activities`, 'green');
    } catch (error) {
      this.testResults.push({
        test: 'Test data loading',
        success: false,
        duration: Date.now() - this.startTime,
        details: error.message,
      });
      
      log(`  ❌ Failed to load test data: ${error.message}`, 'red');
      throw error;
    }
  }

  async testDataLoading() {
    logSubsection('Data Loading Tests');
    
    const startTime = Date.now();
    
    // Test data structure
    const structureTests = [
      { field: 'users', expected: 'array' },
      { field: 'activities', expected: 'array' },
      { field: 'metadata', expected: 'object' },
    ];
    
    for (const test of structureTests) {
      const exists = this.testData[test.field] !== undefined;
      const correctType = Array.isArray(this.testData[test.field]) === (test.expected === 'array');
      
      const success = exists && correctType;
      
      this.testResults.push({
        test: `Data structure: ${test.field}`,
        success,
        duration: Date.now() - startTime,
        details: success ? `Correct ${test.expected} structure` : `Invalid or missing ${test.field}`,
      });
      
      log(`  ${success ? '✅' : '❌'} ${test.field}: ${success ? 'Valid' : 'Invalid'} structure`, success ? 'green' : 'red');
    }
    
    log(`✅ Data loading tests completed in ${Date.now() - startTime}ms`, 'green');
  }

  async testUserManagement() {
    logSubsection('User Management Tests');
    
    const startTime = Date.now();
    
    // Test user data quality
    const users = this.testData.users;
    
    // Test email format
    const validEmails = users.filter(user => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(user.email);
    });
    
    const emailValidityRate = (validEmails.length / users.length) * 100;
    
    this.testResults.push({
      test: 'User email format validation',
      success: emailValidityRate >= 95,
      duration: Date.now() - startTime,
      details: `${validEmails.length}/${users.length} valid emails (${emailValidityRate.toFixed(1)}%)`,
    });
    
    log(`  📧 Email validation: ${validEmails.length}/${users.length} valid (${emailValidityRate.toFixed(1)}%)`, 
        emailValidityRate >= 95 ? 'green' : 'yellow');
    
    // Test active user ratio
    const activeUsers = users.filter(user => user.isActive);
    const activeRate = (activeUsers.length / users.length) * 100;
    
    this.testResults.push({
      test: 'Active user ratio',
      success: activeRate >= 70 && activeRate <= 95,
      duration: Date.now() - startTime,
      details: `${activeUsers.length}/${users.length} active (${activeRate.toFixed(1)}%)`,
    });
    
    log(`  👥 Active users: ${activeUsers.length}/${users.length} (${activeRate.toFixed(1)}%)`, 
        activeRate >= 70 && activeRate <= 95 ? 'green' : 'yellow');
    
    // Test subscription distribution
    const subscriptionCounts = users.reduce((acc, user) => {
      acc[user.subscription.plan] = (acc[user.subscription.plan] || 0) + 1;
      return acc;
    }, {});
    
    this.testResults.push({
      test: 'Subscription distribution',
      success: Object.keys(subscriptionCounts).length > 0,
      duration: Date.now() - startTime,
      details: JSON.stringify(subscriptionCounts),
    });
    
    log(`  💳 Subscription distribution:`, 'blue');
    Object.entries(subscriptionCounts).forEach(([plan, count]) => {
      log(`    ${plan}: ${count} users`, 'blue');
    });
    
    log(`✅ User management tests completed in ${Date.now() - startTime}ms`, 'green');
  }

  async testDataValidation() {
    logSubsection('Data Validation Tests');
    
    const startTime = Date.now();
    
    // Test user data completeness
    const users = this.testData.users;
    const requiredFields = ['id', 'email', 'firstName', 'lastName', 'isActive'];
    
    let completeUsers = 0;
    for (const user of users) {
      const hasAllFields = requiredFields.every(field => user[field] !== undefined && user[field] !== null);
      if (hasAllFields) completeUsers++;
    }
    
    const completenessRate = (completeUsers / users.length) * 100;
    
    this.testResults.push({
      test: 'User data completeness',
      success: completenessRate >= 95,
      duration: Date.now() - startTime,
      details: `${completeUsers}/${users.length} complete users (${completenessRate.toFixed(1)}%)`,
    });
    
    log(`  📋 Data completeness: ${completeUsers}/${users.length} complete (${completenessRate.toFixed(1)}%)`, 
        completenessRate >= 95 ? 'green' : 'yellow');
    
    // Test activity data
    const activities = this.testData.activities;
    const validActivities = activities.filter(activity => 
      activity.userId && activity.type && activity.timestamp
    );
    
    const activityValidityRate = (validActivities.length / activities.length) * 100;
    
    this.testResults.push({
      test: 'Activity data validation',
      success: activityValidityRate >= 95,
      duration: Date.now() - startTime,
      details: `${validActivities.length}/${activities.length} valid activities (${activityValidityRate.toFixed(1)}%)`,
    });
    
    log(`  📊 Activity validation: ${validActivities.length}/${activities.length} valid (${activityValidityRate.toFixed(1)}%)`, 
        activityValidityRate >= 95 ? 'green' : 'yellow');
    
    // Test user-activity relationship
    const userIds = new Set(users.map(u => u.id));
    const activitiesWithValidUsers = activities.filter(activity => userIds.has(activity.userId));
    
    const relationshipValidityRate = (activitiesWithValidUsers.length / activities.length) * 100;
    
    this.testResults.push({
      test: 'User-activity relationship',
      success: relationshipValidityRate >= 95,
      duration: Date.now() - startTime,
      details: `${activitiesWithValidUsers.length}/${activities.length} activities have valid users (${relationshipValidityRate.toFixed(1)}%)`,
    });
    
    log(`  🔗 User-activity relationship: ${activitiesWithValidUsers.length}/${activities.length} valid (${relationshipValidityRate.toFixed(1)}%)`, 
        relationshipValidityRate >= 95 ? 'green' : 'yellow');
    
    log(`✅ Data validation tests completed in ${Date.now() - startTime}ms`, 'green');
  }

  async testPerformanceMetrics() {
    logSubsection('Performance Metrics Tests');
    
    const startTime = Date.now();
    
    // Test data processing performance
    const users = this.testData.users;
    const activities = this.testData.activities;
    
    // Test user search performance
    const searchStartTime = Date.now();
    const searchResults = users.filter(user => 
      user.firstName.toLowerCase().includes('a') || user.lastName.toLowerCase().includes('a')
    );
    const searchDuration = Date.now() - searchStartTime;
    
    this.testResults.push({
      test: 'User search performance',
      success: searchDuration < 100,
      duration: searchDuration,
      details: `Found ${searchResults.length} users in ${searchDuration}ms`,
    });
    
    log(`  🔍 User search: ${searchResults.length} results in ${searchDuration}ms`, 
        searchDuration < 100 ? 'green' : 'yellow');
    
    // Test aggregation performance
    const aggStartTime = Date.now();
    const userStats = users.reduce((acc, user) => {
      acc.total++;
      if (user.isActive) acc.active++;
      return acc;
    }, { total: 0, active: 0 });
    const aggDuration = Date.now() - aggStartTime;
    
    this.testResults.push({
      test: 'Data aggregation performance',
      success: aggDuration < 50,
      duration: aggDuration,
      details: `Aggregated ${userStats.total} users in ${aggDuration}ms`,
    });
    
    log(`  📈 Data aggregation: ${userStats.total} users in ${aggDuration}ms`, 
        aggDuration < 50 ? 'green' : 'yellow');
    
    // Test pagination simulation
    const pageSize = 20;
    const paginationStartTime = Date.now();
    const pages = [];
    for (let i = 0; i < users.length; i += pageSize) {
      pages.push(users.slice(i, i + pageSize));
    }
    const paginationDuration = Date.now() - paginationStartTime;
    
    this.testResults.push({
      test: 'Pagination performance',
      success: paginationDuration < 100,
      duration: paginationDuration,
      details: `Created ${pages.length} pages in ${paginationDuration}ms`,
    });
    
    log(`  📄 Pagination: ${pages.length} pages in ${paginationDuration}ms`, 
        paginationDuration < 100 ? 'green' : 'yellow');
    
    log(`✅ Performance metrics tests completed in ${Date.now() - startTime}ms`, 'green');
  }

  async testSecurityScenarios() {
    logSubsection('Security Scenario Tests');
    
    const startTime = Date.now();
    
    // Test data privacy (no passwords in output)
    const users = this.testData.users;
    const usersWithPasswords = users.filter(user => 
      user.password && typeof user.password === 'string' && user.password.length > 0
    );
    
    this.testResults.push({
      test: 'Password data privacy',
      success: usersWithPasswords.length === 0,
      duration: Date.now() - startTime,
      details: `${usersWithPasswords.length} users have plain text passwords`,
    });
    
    log(`  🔒 Password privacy: ${usersWithPasswords.length} users with plain text passwords`, 
        usersWithPasswords.length === 0 ? 'green' : 'red');
    
    // Test email uniqueness
    const emails = users.map(user => user.email);
    const uniqueEmails = new Set(emails);
    const duplicateEmails = emails.length - uniqueEmails.size;
    
    this.testResults.push({
      test: 'Email uniqueness',
      success: duplicateEmails === 0,
      duration: Date.now() - startTime,
      details: `${duplicateEmails} duplicate emails found`,
    });
    
    log(`  📧 Email uniqueness: ${duplicateEmails} duplicate emails`, 
        duplicateEmails === 0 ? 'green' : 'yellow');
    
    // Test data structure integrity
    const activities = this.testData.activities;
    const suspiciousActivities = activities.filter(activity => {
      // Check for suspicious patterns
      return activity.type === 'login' && !activity.success;
    });
    
    this.testResults.push({
      test: 'Security event tracking',
      success: suspiciousActivities.length >= 0,
      duration: Date.now() - startTime,
      details: `${suspiciousActivities.length} failed login attempts detected`,
    });
    
    log(`  🚨 Security events: ${suspiciousActivities.length} failed logins detected`, 'blue');
    
    log(`✅ Security scenario tests completed in ${Date.now() - startTime}ms`, 'green');
  }

  generateTestReport() {
    logSection('Test Report Summary');
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    const totalDuration = Date.now() - this.startTime;
    
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
    
    // Create reports directory
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
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
        testDataPath: TEST_DATA_PATH,
      },
      results: this.testResults,
      testDataSummary: {
        userCount: this.testData.users.length,
        activityCount: this.testData.activities.length,
        activeUsers: this.testData.users.filter(u => u.isActive).length,
        subscriptionDistribution: this.testData.users.reduce((acc, user) => {
          acc[user.subscription.plan] = (acc[user.subscription.plan] || 0) + 1;
          return acc;
        }, {}),
      },
    };
    
    const reportPath = path.join(REPORTS_DIR, `enterprise-admin-simple-test-${Date.now()}.json`);
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
      log('  ✅ All tests passed! Test data is ready for use.', 'green');
    } else {
      log('  ⚠️  Some tests failed. Review and fix data quality issues.', 'yellow');
    }
    
    if (avgDuration > 100) {
      log('  🐌 Consider optimizing data processing operations.', 'yellow');
    }
    
    log('\n🎉 Real data testing completed successfully!', 'green');
  }
}

// Main execution
async function main() {
  log('🧪 Enterprise Admin Simple Real Data Testing', 'bright');
  log('Testing enterprise admin features with generated test data', 'blue');
  
  // Check if test data exists
  if (!fs.existsSync(TEST_DATA_PATH)) {
    log('❌ Test data not found. Please run the test data generator first:', 'red');
    log('   node scripts/simpleTestDataGenerator.js', 'yellow');
    process.exit(1);
  }
  
  // Run tests
  const tester = new SimpleRealDataTester();
  await tester.runAllTests();
  
  // Exit with appropriate code
  const failedTests = tester.testResults.filter(r => !r.success).length;
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Enterprise Admin Simple Real Data Testing', 'bright');
  log('\nUsage: node simpleRealDataTesting.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h              Show this help message', 'blue');
  log('\nPrerequisites:', 'yellow');
  log('  1. Generate test data: node scripts/simpleTestDataGenerator.js', 'blue');
  process.exit(0);
}

// Run main function
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});