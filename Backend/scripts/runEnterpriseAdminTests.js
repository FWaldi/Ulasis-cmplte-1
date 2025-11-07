#!/usr/bin/env node

/**
 * Enterprise Admin Test Runner
 * 
 * This script runs all enterprise admin related tests including:
 * - Unit tests for controllers and middleware
 * - Integration tests for API endpoints
 * - Security tests for authentication and authorization
 * - Performance tests for admin operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output
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

function runCommand(command, description) {
  logSubsection(description);
  
  try {
    const startTime = Date.now();
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: path.join(__dirname, '../..')
    });
    const duration = Date.now() - startTime;
    
    log(`✅ ${description} completed successfully (${duration}ms)`, 'green');
    
    // Parse Jest output for summary
    const lines = output.split('\n');
    const summaryLine = lines.find(line => line.includes('Test Suites:') && line.includes('passed'));
    if (summaryLine) {
      log(`   ${summaryLine.trim()}`, 'blue');
    }
    
    return { success: true, output, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${description} failed (${duration}ms)`, 'red');
    
    // Parse Jest output for error summary
    const output = error.stdout || error.message;
    const lines = output.split('\n');
    const summaryLine = lines.find(line => line.includes('Test Suites:') && (line.includes('failed') || line.includes('passed')));
    if (summaryLine) {
      log(`   ${summaryLine.trim()}`, 'red');
    }
    
    return { success: false, output, duration, error };
  }
}

function checkTestFiles() {
  logSection('Checking Test Files');
  
  const testFiles = [
    'tests/unit/enterpriseAdminAuth.test.js',
    'tests/unit/enterpriseAdminAuthMiddleware.test.js',
    'tests/integration/enterpriseAdmin.test.js',
    'tests/security/enterpriseAdminSecurity.test.js',
  ];
  
  let allFilesExist = true;
  
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '../..', file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - Not found`, 'red');
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

function generateTestReport(results) {
  logSection('Test Report Summary');
  
  const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  
  log(`Total Tests Run: ${results.length}`, 'blue');
  log(`Successful: ${successfulTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Total Duration: ${totalDuration}ms`, 'blue');
  
  if (failedTests > 0) {
    log('\nFailed Tests:', 'red');
    results.forEach((result, index) => {
      if (!result.success) {
        log(`  ${index + 1}. ${result.description}`, 'red');
      }
    });
  }
  
  // Generate coverage report if available
  const coverageDir = path.join(__dirname, '../../coverage');
  if (fs.existsSync(coverageDir)) {
    log('\n📊 Coverage report generated in coverage/ directory', 'cyan');
    log('   Open coverage/lcov-report/index.html to view detailed coverage', 'blue');
  }
}

function main() {
  log('🧪 Enterprise Admin Test Runner', 'bright');
  log('Running comprehensive test suite for Enterprise Admin System', 'blue');
  
  // Check if test files exist
  if (!checkTestFiles()) {
    log('\n❌ Some test files are missing. Please ensure all test files are created.', 'red');
    process.exit(1);
  }
  
  const results = [];
  
  // Run unit tests
  logSection('Unit Tests');
  
  const unitTestResult = runCommand(
    'npm test -- tests/unit/enterpriseAdminAuth.test.js tests/unit/enterpriseAdminAuthMiddleware.test.js --verbose',
    'Enterprise Admin Unit Tests'
  );
  results.push(unitTestResult);
  
  // Run integration tests
  logSection('Integration Tests');
  
  const integrationTestResult = runCommand(
    'npm test -- tests/integration/enterpriseAdmin.test.js --verbose',
    'Enterprise Admin Integration Tests'
  );
  results.push(integrationTestResult);
  
  // Run security tests
  logSection('Security Tests');
  
  const securityTestResult = runCommand(
    'npm test -- tests/security/enterpriseAdminSecurity.test.js --verbose',
    'Enterprise Admin Security Tests'
  );
  results.push(securityTestResult);
  
  // Run all enterprise admin tests with coverage
  logSection('Coverage Report');
  
  const coverageResult = runCommand(
    'npm test -- --coverage --testPathPattern=enterpriseAdmin --collectCoverageFrom="src/**/enterpriseAdmin*.{js,ts}"',
    'Enterprise Admin Coverage Analysis'
  );
  results.push(coverageResult);
  
  // Generate summary report
  generateTestReport(results);
  
  // Exit with appropriate code
  const hasFailures = results.some(result => !result.success);
  if (hasFailures) {
    log('\n❌ Some tests failed. Please review the errors above.', 'red');
    process.exit(1);
  } else {
    log('\n🎉 All tests passed successfully!', 'green');
    log('Enterprise Admin System is ready for production deployment.', 'green');
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Enterprise Admin Test Runner', 'bright');
  log('\nUsage: node enterpriseAdminTestRunner.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h     Show this help message', 'blue');
  log('  --unit         Run only unit tests', 'blue');
  log('  --integration  Run only integration tests', 'blue');
  log('  --security     Run only security tests', 'blue');
  log('  --coverage     Run only coverage analysis', 'blue');
  log('\nIf no options are provided, all tests will be run.', 'blue');
  process.exit(0);
}

if (args.includes('--unit')) {
  const result = runCommand(
    'npm test -- tests/unit/enterpriseAdminAuth.test.js tests/unit/enterpriseAdminAuthMiddleware.test.js --verbose',
    'Enterprise Admin Unit Tests'
  );
  generateTestReport([result]);
  process.exit(result.success ? 0 : 1);
}

if (args.includes('--integration')) {
  const result = runCommand(
    'npm test -- tests/integration/enterpriseAdmin.test.js --verbose',
    'Enterprise Admin Integration Tests'
  );
  generateTestReport([result]);
  process.exit(result.success ? 0 : 1);
}

if (args.includes('--security')) {
  const result = runCommand(
    'npm test -- tests/security/enterpriseAdminSecurity.test.js --verbose',
    'Enterprise Admin Security Tests'
  );
  generateTestReport([result]);
  process.exit(result.success ? 0 : 1);
}

if (args.includes('--coverage')) {
  const result = runCommand(
    'npm test -- --coverage --testPathPattern=enterpriseAdmin --collectCoverageFrom="src/**/enterpriseAdmin*.{js,ts}"',
    'Enterprise Admin Coverage Analysis'
  );
  generateTestReport([result]);
  process.exit(result.success ? 0 : 1);
}

// Run all tests if no specific option is provided
main();