#!/usr/bin/env node

/**
 * Security Test Runner
 * Executes OWASP ZAP security testing for anonymous feedback collection endpoints
 */

const ZAPSecurityTester = require('./zap-security-test');
const logger = require('../../src/utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Security Test Configuration
 */
const SECURITY_TEST_CONFIG = {
  // ZAP Configuration
  zapHost: process.env.ZAP_HOST || '127.0.0.1',
  zapPort: parseInt(process.env.ZAP_PORT) || 8080,
  zapApiKey: process.env.ZAP_API_KEY || '',

  // Target Configuration
  target: process.env.SECURITY_TEST_TARGET || 'http://localhost:3001',
  contextName: 'Anonymous-Feedback-Collection',

  // Security Thresholds
  thresholds: {
    maxHighRisk: parseInt(process.env.MAX_HIGH_RISK) || 0,
    maxMediumRisk: parseInt(process.env.MAX_MEDIUM_RISK) || 5,
    maxLowRisk: parseInt(process.env.MAX_LOW_RISK) || 20,
  },

  // Report Configuration
  outputDir: process.env.SECURITY_REPORT_DIR || path.join(__dirname, '../../reports'),

  // Test Scenarios
  testScenarios: [
    {
      name: 'Anonymous Response Submission',
      endpoint: '/api/v1/responses/anonymous',
      method: 'POST',
      testData: {
        questionnaire_id: 1,
        qr_code_id: 1,
        answers: [
          {
            question_id: 1,
            answer_value: 'Test response',
            rating_score: 4,
          },
        ],
      },
    },
    {
      name: 'Questionnaire Analytics',
      endpoint: '/api/v1/responses/analytics/1',
      method: 'GET',
    },
    {
      name: 'QR Code Scan Tracking',
      endpoint: '/api/v1/qr-codes/scan/1',
      method: 'POST',
    },
    {
      name: 'Location Performance Analytics',
      endpoint: '/api/v1/analytics/locations/test-location',
      method: 'GET',
    },
  ],
};

/**
 * Ensure reports directory exists
 */
async function ensureReportsDirectory() {
  try {
    await fs.access(SECURITY_TEST_CONFIG.outputDir);
  } catch (error) {
    await fs.mkdir(SECURITY_TEST_CONFIG.outputDir, { recursive: true });
    logger.info(`Created reports directory: ${SECURITY_TEST_CONFIG.outputDir}`);
  }
}

/**
 * Run security tests with error handling
 */
async function runSecurityTests() {
  const startTime = Date.now();

  try {
    logger.info('='.repeat(60));
    logger.info('STARTING OWASP ZAP SECURITY TESTING');
    logger.info('='.repeat(60));
    logger.info(`Target: ${SECURITY_TEST_CONFIG.target}`);
    logger.info(`ZAP Proxy: ${SECURITY_TEST_CONFIG.zapHost}:${SECURITY_TEST_CONFIG.zapPort}`);
    logger.info(`Context: ${SECURITY_TEST_CONFIG.contextName}`);
    logger.info('='.repeat(60));

    // Ensure reports directory exists
    await ensureReportsDirectory();

    // Initialize security tester
    const tester = new ZAPSecurityTester({
      zapHost: SECURITY_TEST_CONFIG.zapHost,
      zapPort: SECURITY_TEST_CONFIG.zapPort,
      zapApiKey: SECURITY_TEST_CONFIG.zapApiKey,
      target: SECURITY_TEST_CONFIG.target,
      contextName: SECURITY_TEST_CONFIG.contextName,
    });

    // Run full security scan
    const report = await tester.runFullScan();

    // Validate results against thresholds
    const validation = tester.validateResults(SECURITY_TEST_CONFIG.thresholds);

    // Log results
    logger.info('='.repeat(60));
    logger.info('SECURITY SCAN RESULTS');
    logger.info('='.repeat(60));
    logger.info(`Scan Duration: ${Math.round((Date.now() - startTime) / 1000)} seconds`);
    logger.info(`Total Alerts: ${validation.summary.high + validation.summary.medium + validation.summary.low + validation.summary.informational}`);
    logger.info(`High Risk: ${validation.summary.high}`);
    logger.info(`Medium Risk: ${validation.summary.medium}`);
    logger.info(`Low Risk: ${validation.summary.low}`);
    logger.info(`Informational: ${validation.summary.informational}`);
    logger.info(`Security Test Status: ${validation.passed ? 'PASSED' : 'FAILED'}`);

    if (!validation.passed) {
      logger.error('Security Threshold Violations:');
      validation.violations.forEach(violation => {
        logger.error(`  - ${violation}`);
      });
    }

    logger.info('='.repeat(60));

    // Save test summary
    const testSummary = {
      timestamp: new Date().toISOString(),
      duration: Math.round((Date.now() - startTime) / 1000),
      target: SECURITY_TEST_CONFIG.target,
      thresholds: SECURITY_TEST_CONFIG.thresholds,
      results: validation,
      report: {
        htmlPath: path.join(SECURITY_TEST_CONFIG.outputDir, 'zap-security-report.html'),
        jsonPath: path.join(SECURITY_TEST_CONFIG.outputDir, 'zap-security-report.json'),
      },
    };

    const summaryPath = path.join(SECURITY_TEST_CONFIG.outputDir, 'security-test-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(testSummary, null, 2));
    logger.info(`Test summary saved to: ${summaryPath}`);

    // Exit with appropriate code
    if (validation.passed) {
      logger.info('✅ Security tests PASSED - All thresholds met');
      process.exit(0);
    } else {
      logger.error('❌ Security tests FAILED - Threshold violations detected');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Security testing failed:', error);

    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
      config: SECURITY_TEST_CONFIG,
    };

    const errorPath = path.join(SECURITY_TEST_CONFIG.outputDir, 'security-test-error.json');
    await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
    logger.info(`Error report saved to: ${errorPath}`);

    process.exit(2);
  }
}

/**
 * Check if ZAP is available
 */
async function checkZAPAvailability() {
  try {
    const ZAPSecurityTester = require('./zap-security-test');
    const tester = new ZAPSecurityTester(SECURITY_TEST_CONFIG);

    // Try to connect to ZAP
    await tester.initialize();
    logger.info('✅ ZAP is available and ready');
    return true;
  } catch (error) {
    logger.error('❌ ZAP is not available:', error.message);
    logger.error('Please ensure ZAP is running and accessible');
    logger.error(`Expected ZAP at: ${SECURITY_TEST_CONFIG.zapHost}:${SECURITY_TEST_CONFIG.zapPort}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
OWASP ZAP Security Testing Runner

Usage: node run-security-tests.js [options]

Options:
  --help, -h              Show this help message
  --check-zap             Check if ZAP is available and exit
  --target <url>          Target URL to test (default: http://localhost:3001)
  --zap-host <host>       ZAP host (default: 127.0.0.1)
  --zap-port <port>       ZAP port (default: 8080)
  --max-high <number>     Maximum high risk alerts allowed (default: 0)
  --max-medium <number>   Maximum medium risk alerts allowed (default: 5)
  --max-low <number>      Maximum low risk alerts allowed (default: 20)

Environment Variables:
  ZAP_HOST                ZAP host
  ZAP_PORT                ZAP port
  ZAP_API_KEY             ZAP API key
  SECURITY_TEST_TARGET    Target URL
  MAX_HIGH_RISK           Maximum high risk alerts
  MAX_MEDIUM_RISK         Maximum medium risk alerts
  MAX_LOW_RISK            Maximum low risk alerts
  SECURITY_REPORT_DIR     Report output directory

Examples:
  node run-security-tests.js
  node run-security-tests.js --target http://staging.example.com
  node run-security-tests.js --max-high 0 --max-medium 3
  node run-security-tests.js --check-zap
`);
    process.exit(0);
  }

  if (args.includes('--check-zap')) {
    const isAvailable = await checkZAPAvailability();
    process.exit(isAvailable ? 0 : 1);
  }

  // Override config with command line arguments
  const targetIndex = args.indexOf('--target');
  if (targetIndex !== -1 && args[targetIndex + 1]) {
    SECURITY_TEST_CONFIG.target = args[targetIndex + 1];
  }

  const zapHostIndex = args.indexOf('--zap-host');
  if (zapHostIndex !== -1 && args[zapHostIndex + 1]) {
    SECURITY_TEST_CONFIG.zapHost = args[zapHostIndex + 1];
  }

  const zapPortIndex = args.indexOf('--zap-port');
  if (zapPortIndex !== -1 && args[zapPortIndex + 1]) {
    SECURITY_TEST_CONFIG.zapPort = parseInt(args[zapPortIndex + 1]);
  }

  const maxHighIndex = args.indexOf('--max-high');
  if (maxHighIndex !== -1 && args[maxHighIndex + 1]) {
    SECURITY_TEST_CONFIG.thresholds.maxHighRisk = parseInt(args[maxHighIndex + 1]);
  }

  const maxMediumIndex = args.indexOf('--max-medium');
  if (maxMediumIndex !== -1 && args[maxMediumIndex + 1]) {
    SECURITY_TEST_CONFIG.thresholds.maxMediumRisk = parseInt(args[maxMediumIndex + 1]);
  }

  const maxLowIndex = args.indexOf('--max-low');
  if (maxLowIndex !== -1 && args[maxLowIndex + 1]) {
    SECURITY_TEST_CONFIG.thresholds.maxLowRisk = parseInt(args[maxLowIndex + 1]);
  }

  // Run security tests
  await runSecurityTests();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(3);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(4);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runSecurityTests,
  checkZAPAvailability,
  SECURITY_TEST_CONFIG,
};