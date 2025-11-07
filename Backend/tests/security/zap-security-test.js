/**
 * OWASP ZAP Security Testing Automation
 * Automated security scanning for anonymous feedback collection endpoints
 */

const ZapClient = require('zaproxy');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../src/utils/logger');

/**
 * OWASP ZAP Security Testing Configuration
 */
class ZAPSecurityTester {
  constructor(options = {}) {
    this.zapOptions = {
      proxy: {
        host: options.zapHost || '127.0.0.1',
        port: options.zapPort || 8080,
      },
      apiKey: options.zapApiKey || process.env.ZAP_API_KEY || '',
      target: options.target || 'http://localhost:3001',
      contextName: options.contextName || 'Anonymous-Feedback-Context',
      contextId: null,
      sessionId: null,
      scanPolicy: options.scanPolicy || 'Default Policy',
    };

    this.zap = new ZapClient({
      proxy: `http://${this.zapOptions.proxy.host}:${this.zapOptions.proxy.port}`,
    });

    this.testResults = {
      scanId: null,
      startTime: null,
      endTime: null,
      alerts: [],
      statistics: {},
      status: 'initialized',
    };
  }

  /**
   * Initialize ZAP session and context
   */
  async initialize() {
    try {
      logger.info('Initializing OWASP ZAP security testing...');

      // Test ZAP connection
      const version = await this.zap.core.version();
      logger.info(`ZAP Version: ${version.version}`);

      // Create new session
      const newSession = await this.zap.core.newSession();
      this.testResults.sessionId = newSession.sessionId;
      logger.info(`Created new ZAP session: ${this.testResults.sessionId}`);

      // Create context for anonymous feedback endpoints
      const context = await this.zap.context.newContext(this.zapOptions.contextName);
      this.zapOptions.contextId = context.contextId;
      logger.info(`Created ZAP context: ${this.zapOptions.contextId} (${this.zapOptions.contextId})`);

      // Define target URLs for anonymous feedback endpoints
      await this.defineTargetUrls();

      // Configure authentication (none for anonymous endpoints)
      await this.configureAuthentication();

      this.testResults.status = 'initialized';
      logger.info('ZAP security testing initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize ZAP security testing:', error);
      throw new Error(`ZAP initialization failed: ${error.message}`);
    }
  }

  /**
   * Define target URLs for anonymous feedback collection
   */
  async defineTargetUrls() {
    const targetUrls = [
      `${this.zapOptions.target}/api/v1/responses/anonymous`,
      `${this.zapOptions.target}/api/v1/responses/questionnaire/:questionnaire_id`,
      `${this.zapOptions.target}/api/v1/responses/analytics/:questionnaire_id`,
      `${this.zapOptions.target}/api/v1/responses/kpis/:questionnaire_id`,
      `${this.zapOptions.target}/api/v1/qr-codes/scan/:qr_code_id`,
      `${this.zapOptions.target}/api/v1/qr-codes/analytics/:qr_code_id`,
      `${this.zapOptions.target}/api/v1/analytics/locations/:location_tag`,
      `${this.zapOptions.target}/api/v1/analytics/locations/top`,
    ];

    for (const url of targetUrls) {
      try {
        await this.zap.context.includeInContext(this.zapOptions.contextId, url);
        logger.info(`Added URL to context: ${url}`);
      } catch (error) {
        logger.warn(`Failed to add URL to context: ${url}`, error);
      }
    }
  }

  /**
   * Configure authentication (none for anonymous endpoints)
   */
  async configureAuthentication() {
    // Anonymous endpoints don't require authentication
    // Set authentication type to None
    await this.zap.authentication.setAuthenticationMethod(
      this.zapOptions.contextId,
      'noneBasedAuthentication',
      'null',
    );
    logger.info('Configured authentication: None (anonymous endpoints)');
  }

  /**
   * Start passive scanning
   */
  async startPassiveScan() {
    try {
      logger.info('Starting passive scan...');

      const recordsToScan = await this.zap.pscan.recordsToScan();
      logger.info(`Records to scan: ${recordsToScan.recordsToScan}`);

      if (recordsToScan.recordsToScan > 0) {
        this.testResults.status = 'passive_scanning';
        logger.info('Passive scan started');
      } else {
        logger.info('No records to passively scan');
      }

    } catch (error) {
      logger.error('Failed to start passive scan:', error);
      throw new Error(`Passive scan failed: ${error.message}`);
    }
  }

  /**
   * Spider/crawl the application
   */
  async startSpider() {
    try {
      logger.info('Starting spider scan...');

      const spiderId = await this.zap.spider.scan(this.zapOptions.target);
      this.testResults.scanId = spiderId.scan;
      this.testResults.startTime = new Date();
      this.testResults.status = 'spidering';

      logger.info(`Spider scan started with ID: ${spiderId.scan}`);

      // Monitor spider progress
      await this.monitorSpiderProgress(spiderId.scan);

    } catch (error) {
      logger.error('Failed to start spider scan:', error);
      throw new Error(`Spider scan failed: ${error.message}`);
    }
  }

  /**
   * Monitor spider scan progress
   */
  async monitorSpiderProgress(scanId) {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.zap.spider.status(scanId);
        const progress = parseInt(status.status);

        logger.info(`Spider progress: ${progress}%`);

        if (progress >= 100) {
          logger.info('Spider scan completed');
          const results = await this.zap.spider.results(scanId);
          logger.info(`Spider found ${results.results.length} URLs`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      } catch (error) {
        logger.warn('Error checking spider status:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (Date.now() - startTime >= maxWaitTime) {
      throw new Error('Spider scan timed out after 10 minutes');
    }
  }

  /**
   * Start active scanning
   */
  async startActiveScan() {
    try {
      logger.info('Starting active scan...');

      const scanId = await this.zap.ascan.scan(this.zapOptions.target);
      this.testResults.scanId = scanId.scan;
      this.testResults.status = 'active_scanning';

      logger.info(`Active scan started with ID: ${scanId.scan}`);

      // Monitor active scan progress
      await this.monitorActiveScanProgress(scanId.scan);

    } catch (error) {
      logger.error('Failed to start active scan:', error);
      throw new Error(`Active scan failed: ${error.message}`);
    }
  }

  /**
   * Monitor active scan progress
   */
  async monitorActiveScanProgress(scanId) {
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.zap.ascan.status(scanId);
        const progress = parseInt(status.status);

        logger.info(`Active scan progress: ${progress}%`);

        if (progress >= 100) {
          logger.info('Active scan completed');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      } catch (error) {
        logger.warn('Error checking active scan status:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    if (Date.now() - startTime >= maxWaitTime) {
      throw new Error('Active scan timed out after 30 minutes');
    }
  }

  /**
   * Wait for passive scan to complete
   */
  async waitForPassiveScan() {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const records = await this.zap.pscan.recordsToScan();

        if (records.recordsToScan === 0) {
          logger.info('Passive scan completed');
          break;
        }

        logger.info(`Passive scan records remaining: ${records.recordsToScan}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        logger.warn('Error checking passive scan status:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (Date.now() - startTime >= maxWaitTime) {
      logger.warn('Passive scan timed out, continuing with results');
    }
  }

  /**
   * Generate security report
   */
  async generateReport() {
    try {
      logger.info('Generating security report...');

      // Get all alerts
      const alerts = await this.zap.core.alerts();
      this.testResults.alerts = alerts.alerts;
      this.testResults.endTime = new Date();
      this.testResults.status = 'completed';

      // Generate statistics
      await this.generateStatistics();

      // Generate HTML report
      const htmlReport = await this.zap.core.htmlreport();
      const reportPath = path.join(__dirname, '../../reports/zap-security-report.html');
      await fs.writeFile(reportPath, htmlReport);
      logger.info(`HTML report saved to: ${reportPath}`);

      // Generate JSON report
      const jsonReport = {
        scanInfo: {
          scanId: this.testResults.scanId,
          sessionId: this.testResults.sessionId,
          startTime: this.testResults.startTime,
          endTime: this.testResults.endTime,
          target: this.zapOptions.target,
          contextName: this.zapOptions.contextName,
        },
        statistics: this.testResults.statistics,
        alerts: this.testResults.alerts,
      };

      const jsonReportPath = path.join(__dirname, '../../reports/zap-security-report.json');
      await fs.writeFile(jsonReportPath, JSON.stringify(jsonReport, null, 2));
      logger.info(`JSON report saved to: ${jsonReportPath}`);

      return jsonReport;

    } catch (error) {
      logger.error('Failed to generate security report:', error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate scan statistics
   */
  async generateStatistics() {
    try {
      const stats = await this.zap.core.stats();
      this.testResults.statistics = stats.statsList;

      // Calculate alert statistics
      const alertStats = {
        total: this.testResults.alerts.length,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
      };

      this.testResults.alerts.forEach(alert => {
        switch (alert.risk) {
          case 'High':
            alertStats.high++;
            break;
          case 'Medium':
            alertStats.medium++;
            break;
          case 'Low':
            alertStats.low++;
            break;
          case 'Informational':
            alertStats.informational++;
            break;
        }
      });

      this.testResults.statistics.alertBreakdown = alertStats;
      logger.info('Security scan statistics generated');

    } catch (error) {
      logger.error('Failed to generate statistics:', error);
    }
  }

  /**
   * Run complete security scan
   */
  async runFullScan() {
    try {
      logger.info('Starting complete OWASP ZAP security scan...');

      await this.initialize();
      await this.startSpider();
      await this.startPassiveScan();
      await this.startActiveScan();
      await this.waitForPassiveScan();
      const report = await this.generateReport();

      logger.info('OWASP ZAP security scan completed successfully');
      return report;

    } catch (error) {
      logger.error('OWASP ZAP security scan failed:', error);
      throw error;
    }
  }

  /**
   * Validate scan results against security thresholds
   */
  validateResults(thresholds = {}) {
    const defaultThresholds = {
      maxHighRisk: 0,
      maxMediumRisk: 5,
      maxLowRisk: 20,
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };
    const stats = this.testResults.statistics.alertBreakdown;

    const validation = {
      passed: true,
      violations: [],
      summary: {
        high: stats.high,
        medium: stats.medium,
        low: stats.low,
        informational: stats.informational,
      },
    };

    if (stats.high > finalThresholds.maxHighRisk) {
      validation.passed = false;
      validation.violations.push(`High risk alerts (${stats.high}) exceed threshold (${finalThresholds.maxHighRisk})`);
    }

    if (stats.medium > finalThresholds.maxMediumRisk) {
      validation.passed = false;
      validation.violations.push(`Medium risk alerts (${stats.medium}) exceed threshold (${finalThresholds.maxMediumRisk})`);
    }

    if (stats.low > finalThresholds.maxLowRisk) {
      validation.passed = false;
      validation.violations.push(`Low risk alerts (${stats.low}) exceed threshold (${finalThresholds.maxLowRisk})`);
    }

    return validation;
  }
}

module.exports = ZAPSecurityTester;