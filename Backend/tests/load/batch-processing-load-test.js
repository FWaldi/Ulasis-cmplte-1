'use strict';

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * Batch Processing Load Test
 * Tests the system's ability to handle 1000+ concurrent anonymous submissions
 */

class BatchProcessingLoadTest {
  constructor() {
    this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    this.apiEndpoint = `${this.baseURL}/api/v1/responses/anonymous`;
    this.batchStatusEndpoint = `${this.baseURL}/api/v1/responses/batch/status`;

    // Test configuration
    this.testConfigs = {
      light: { concurrentUsers: 100, requestsPerUser: 5, rampUpTime: 10000 },
      medium: { concurrentUsers: 500, requestsPerUser: 3, rampUpTime: 30000 },
      heavy: { concurrentUsers: 1000, requestsPerUser: 2, rampUpTime: 60000 },
      stress: { concurrentUsers: 2000, requestsPerUser: 1, rampUpTime: 90000 },
    };

    // Test data
    this.testQuestionnaireId = 1;
    this.testQRCodeId = 1;
    this.testAnswers = [
      { question_id: 1, answer_value: '4', rating_score: 4 },
      { question_id: 2, answer_value: 'The service was excellent', rating_score: null },
      { question_id: 3, answer_value: 'yes', rating_score: 5 },
    ];

    // Results tracking
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null,
      throughput: 0,
    };
  }

  /**
   * Generate test payload for anonymous submission
   * @param {number} userId - User identifier for variation
   * @returns {Object} Test payload
   */
  generateTestPayload(userId = Math.random()) {
    return {
      questionnaire_id: this.testQuestionnaireId,
      qr_code_id: this.testQRCodeId,
      answers: this.testAnswers.map((answer, index) => ({
        ...answer,
        answer_value: index === 1 ? `Test feedback from user ${userId}` : answer.answer_value,
      })),
    };
  }

  /**
   * Make a single request to the anonymous submission endpoint
   * @param {number} userId - User identifier
   * @returns {Promise<Object>} Request result
   */
  async makeRequest(userId) {
    const startTime = performance.now();

    try {
      const payload = this.generateTestPayload(userId);
      const response = await axios.post(this.apiEndpoint, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `LoadTest-Client-${userId}`,
        },
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        success: true,
        responseTime,
        statusCode: response.status,
        data: response.data,
        userId,
      };

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        success: false,
        responseTime,
        error: error.message,
        statusCode: error.response?.status || 0,
        userId,
      };
    }
  }

  /**
   * Execute load test with specified configuration
   * @param {string} configName - Test configuration name
   * @returns {Promise<Object>} Test results
   */
  async executeLoadTest(configName = 'medium') {
    const config = this.testConfigs[configName];
    if (!config) {
      throw new Error(`Unknown test configuration: ${configName}`);
    }

    console.log(`\n🚀 Starting ${configName.toUpperCase()} load test...`);
    console.log(`Configuration: ${config.concurrentUsers} concurrent users, ${config.requestsPerUser} requests per user`);
    console.log(`Ramp-up time: ${config.rampUpTime / 1000} seconds`);

    // Reset results
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null,
      throughput: 0,
    };

    const totalRequests = config.concurrentUsers * config.requestsPerUser;
    const promises = [];
    const delayBetweenUsers = config.rampUpTime / config.concurrentUsers;

    // Create user simulation functions
    for (let userId = 0; userId < config.concurrentUsers; userId++) {
      const userDelay = userId * delayBetweenUsers;

      for (let req = 0; req < config.requestsPerUser; req++) {
        const promise = new Promise(resolve => {
          setTimeout(async () => {
            const result = await this.makeRequest(userId);
            this.processResult(result);
            resolve(result);
          }, userDelay + (req * 100)); // Small delay between requests from same user
        });

        promises.push(promise);
      }
    }

    // Wait for all requests to complete
    console.log(`\n⏳ Executing ${totalRequests} requests...`);
    const allResults = await Promise.all(promises);

    // Calculate final metrics
    this.results.endTime = Date.now();
    this.calculateMetrics();

    // Log results
    this.logResults(configName, config);

    // Save results to file
    await this.saveResults(configName);

    return this.results;
  }

  /**
   * Process individual request result
   * @param {Object} result - Request result
   */
  processResult(result) {
    this.results.totalRequests++;
    this.results.responseTimes.push(result.responseTime);

    if (result.success) {
      this.results.successfulRequests++;
    } else {
      this.results.failedRequests++;
      this.results.errors.push({
        error: result.error,
        statusCode: result.statusCode,
        userId: result.userId,
        responseTime: result.responseTime,
      });
    }

    // Update response time metrics
    this.results.minResponseTime = Math.min(this.results.minResponseTime, result.responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.responseTime);
  }

  /**
   * Calculate final metrics
   */
  calculateMetrics() {
    const totalTime = this.results.endTime - this.results.startTime;

    // Average response time
    if (this.results.responseTimes.length > 0) {
      this.results.averageResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    }

    // Throughput (requests per second)
    this.results.throughput = (this.results.totalRequests / totalTime) * 1000;

    // Percentiles
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    this.results.p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    this.results.p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    this.results.p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    this.results.p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  }

  /**
   * Log test results to console
   * @param {string} configName - Test configuration name
   * @param {Object} config - Test configuration
   */
  logResults(configName, config) {
    console.log(`\n✅ ${configName.toUpperCase()} load test completed!`);
    console.log('\n📊 Test Results:');
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed: ${this.results.failedRequests} (${((this.results.failedRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);

    console.log('\n⏱️ Response Times:');
    console.log(`Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`Min: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`Max: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`50th percentile: ${this.results.p50.toFixed(2)}ms`);
    console.log(`90th percentile: ${this.results.p90.toFixed(2)}ms`);
    console.log(`95th percentile: ${this.results.p95.toFixed(2)}ms`);
    console.log(`99th percentile: ${this.results.p99.toFixed(2)}ms`);

    console.log('\n🚀 Performance:');
    console.log(`Throughput: ${this.results.throughput.toFixed(2)} requests/second`);
    console.log(`Test Duration: ${(this.results.endTime - this.results.startTime) / 1000} seconds`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Common Errors:');
      const errorCounts = {};
      this.results.errors.forEach(error => {
        errorCounts[error.error] = (errorCounts[error.error] || 0) + 1;
      });
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`${error}: ${count} occurrences`);
      });
    }
  }

  /**
   * Save results to JSON file
   * @param {string} configName - Test configuration name
   */
  async saveResults(configName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch-processing-load-test-${configName}-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', '..', 'logs', 'load-tests', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const resultsData = {
      testConfig: configName,
      configuration: this.testConfigs[configName],
      timestamp: new Date().toISOString(),
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        baseURL: this.baseURL,
      },
    };

    fs.writeFileSync(filepath, JSON.stringify(resultsData, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
  }

  /**
   * Monitor batch processing status during test
   * @param {number} duration - Monitoring duration in milliseconds
   */
  async monitorBatchProcessing(duration = 60000) {
    console.log('\n👀 Monitoring batch processing status...');

    const startTime = Date.now();
    const monitoringData = [];

    while (Date.now() - startTime < duration) {
      try {
        const response = await axios.get(this.batchStatusEndpoint, {
          headers: {
            'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-token'}`,
          },
        });

        monitoringData.push({
          timestamp: new Date().toISOString(),
          queueSize: response.data.data.queueSize,
          activeBatches: response.data.data.activeBatches,
          metrics: response.data.data.metrics,
        });

        console.log(`Queue: ${response.data.data.queueSize}, Active Batches: ${response.data.data.activeBatches}`);

      } catch (error) {
        console.warn('Failed to get batch status:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    }

    // Save monitoring data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch-processing-monitor-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', '..', 'logs', 'load-tests', filename);

    fs.writeFileSync(filepath, JSON.stringify(monitoringData, null, 2));
    console.log(`\n💾 Monitoring data saved to: ${filepath}`);
  }

  /**
   * Run all test configurations sequentially
   */
  async runAllTests() {
    console.log('🎯 Starting comprehensive batch processing load tests...\n');

    const testConfigs = Object.keys(this.testConfigs);
    const allResults = {};

    for (const configName of testConfigs) {
      try {
        // Start monitoring in parallel
        const monitoringPromise = this.monitorBatchProcessing(120000); // 2 minutes

        // Run the load test
        const testResult = await this.executeLoadTest(configName);
        allResults[configName] = testResult;

        // Wait for monitoring to complete
        await monitoringPromise;

        // Wait between tests
        if (testConfigs.indexOf(configName) < testConfigs.length - 1) {
          console.log('\n⏳ Waiting 30 seconds before next test...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

      } catch (error) {
        console.error(`❌ Test ${configName} failed:`, error);
        allResults[configName] = { error: error.message };
      }
    }

    // Generate summary report
    this.generateSummaryReport(allResults);

    return allResults;
  }

  /**
   * Generate summary report for all tests
   * @param {Object} allResults - All test results
   */
  generateSummaryReport(allResults) {
    console.log('\n📋 SUMMARY REPORT');
    console.log('================');

    Object.entries(allResults).forEach(([configName, result]) => {
      if (result.error) {
        console.log(`\n❌ ${configName.toUpperCase()}: FAILED - ${result.error}`);
      } else {
        const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(2);
        console.log(`\n✅ ${configName.toUpperCase()}:`);
        console.log(`   Success Rate: ${successRate}%`);
        console.log(`   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
        console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s`);
        console.log(`   95th Percentile: ${result.p95.toFixed(2)}ms`);
      }
    });

    console.log('\n🎯 Performance Targets:');
    console.log('• Success Rate: >99%');
    console.log('• Average Response Time: <500ms');
    console.log('• 95th Percentile: <1000ms');
    console.log('• Throughput: >100 req/s');
  }
}

// CLI interface
if (require.main === module) {
  const loadTest = new BatchProcessingLoadTest();
  const testType = process.argv[2] || 'medium';

  if (testType === 'all') {
    loadTest.runAllTests().catch(console.error);
  } else {
    loadTest.executeLoadTest(testType).catch(console.error);
  }
}

module.exports = BatchProcessingLoadTest;