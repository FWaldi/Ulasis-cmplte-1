#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');
const { getDatabaseSecurityConfig } = require('../src/config/database-security');

/**
 * Migration Testing Script
 * 
 * This script provides comprehensive migration testing including:
 * - Migration execution testing
 * - Rollback validation
 * - Data integrity verification
 * - Performance impact analysis
 * - Clean and existing data testing
 */

class MigrationTester {
  constructor() {
    this.config = getDatabaseSecurityConfig();
    this.testDatabase = `${this.config.database}_test_migrations`;
    this.originalDatabase = this.config.database;
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.testResults = {
      migrationTests: [],
      rollbackTests: [],
      integrityTests: [],
      performanceTests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * Execute command and return promise
   */
  async executeCommand(command, description) {
    return new Promise((resolve, reject) => {
      logger.info(`Executing: ${description}`);
      
      exec(command, { 
        env: { ...process.env, DB_NAME: this.testDatabase },
        cwd: path.join(__dirname, '..')
      }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Command failed: ${description}`, { error: error.message, stderr });
          reject(error);
          return;
        }
        
        if (stderr) {
          logger.warn(`Command warnings: ${description}`, { stderr });
        }
        
        logger.info(`Command completed: ${description}`);
        resolve({ stdout, stderr });
      });
    });
  }

  /**
   * Create test database
   */
  async createTestDatabase() {
    try {
      logger.info('Creating test database');
      
      // Create test database
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} -e "CREATE DATABASE IF NOT EXISTS ${this.testDatabase};"`,
        'Create test database'
      );

      logger.info(`Test database created: ${this.testDatabase}`);
      
    } catch (error) {
      logger.error('Failed to create test database:', error);
      throw error;
    }
  }

  /**
   * Drop test database
   */
  async dropTestDatabase() {
    try {
      logger.info('Dropping test database');
      
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} -e "DROP DATABASE IF EXISTS ${this.testDatabase};"`,
        'Drop test database'
      );

      logger.info('Test database dropped');
      
    } catch (error) {
      logger.error('Failed to drop test database:', error);
      throw error;
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => path.join(this.migrationsPath, file));
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Test migration execution
   */
  async testMigrationExecution(migrationFile) {
    const migrationName = path.basename(migrationFile, '.js');
    const testResult = {
      migration: migrationName,
      file: migrationFile,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: []
    };

    try {
      logger.info(`Testing migration execution: ${migrationName}`);

      // Run migration up
      await this.executeCommand(
        `node -e "require('${migrationFile}').up()"`,
        `Migration UP: ${migrationName}`
      );

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = true;

      logger.info(`Migration execution successful: ${migrationName}`, {
        duration: testResult.duration
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error(`Migration execution failed: ${migrationName}`, {
        error: error.message,
        duration: testResult.duration
      });
    }

    this.testResults.migrationTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Test migration rollback
   */
  async testMigrationRollback(migrationFile) {
    const migrationName = path.basename(migrationFile, '.js');
    const testResult = {
      migration: migrationName,
      file: migrationFile,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: []
    };

    try {
      logger.info(`Testing migration rollback: ${migrationName}`);

      // Run migration down
      await this.executeCommand(
        `node -e "require('${migrationFile}').down()"`,
        `Migration DOWN: ${migrationName}`
      );

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = true;

      logger.info(`Migration rollback successful: ${migrationName}`, {
        duration: testResult.duration
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error(`Migration rollback failed: ${migrationName}`, {
        error: error.message,
        duration: testResult.duration
      });
    }

    this.testResults.rollbackTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Verify database schema after migration
   */
  async verifyDatabaseSchema() {
    const testResult = {
      test: 'Database Schema Verification',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: [],
      details: {}
    };

    try {
      logger.info('Verifying database schema');

      // Get table list
      const { stdout: tablesOutput } = await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SHOW TABLES;"`,
        'Get table list'
      );

      const tables = tablesOutput
        .split('\n')
        .filter(line => line.trim() && !line.includes('Tables_in_'))
        .map(line => line.trim());

      testResult.details.tables = tables;

      // Expected tables
      const expectedTables = [
        'users',
        'questionnaires',
        'questions',
        'qr_codes',
        'responses',
        'answers',
        'reviews'
      ];

      // Check for missing tables
      const missingTables = expectedTables.filter(table => !tables.includes(table));
      if (missingTables.length > 0) {
        testResult.warnings.push(`Missing tables: ${missingTables.join(', ')}`);
      }

      // Check for unexpected tables
      const unexpectedTables = tables.filter(table => !expectedTables.includes(table));
      if (unexpectedTables.length > 0) {
        testResult.warnings.push(`Unexpected tables: ${unexpectedTables.join(', ')}`);
      }

      // Verify table structures
      for (const table of expectedTables) {
        if (tables.includes(table)) {
          const { stdout: structureOutput } = await this.executeCommand(
            `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "DESCRIBE ${table};"`,
            `Get table structure: ${table}`
          );

          testResult.details[table] = structureOutput;
        }
      }

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = missingTables.length === 0;

      if (testResult.warnings.length > 0) {
        this.testResults.summary.warnings += testResult.warnings.length;
      }

      logger.info('Database schema verification completed', {
        tablesFound: tables.length,
        expectedTables: expectedTables.length,
        success: testResult.success
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error('Database schema verification failed:', error);
    }

    this.testResults.integrityTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Test data integrity after migrations
   */
  async testDataIntegrity() {
    const testResult = {
      test: 'Data Integrity Verification',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: [],
      details: {}
    };

    try {
      logger.info('Testing data integrity');

      // Insert test data
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "
          INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan, subscription_status, email_verified) VALUES 
          ('test1@example.com', 'hash1', 'Test', 'User1', 'free', 'active', true),
          ('test2@example.com', 'hash2', 'Test', 'User2', 'starter', 'active', false);
        "`,
        'Insert test users'
      );

      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "
          INSERT INTO questionnaires (user_id, title, description, is_active, is_public) VALUES 
          (1, 'Test Questionnaire 1', 'Description 1', true, false),
          (2, 'Test Questionnaire 2', 'Description 2', true, true);
        "`,
        'Insert test questionnaires'
      );

      // Verify foreign key constraints
      try {
        await this.executeCommand(
          `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "
            INSERT INTO questionnaires (user_id, title, description, is_active, is_public) VALUES 
            (999, 'Invalid Questionnaire', 'Should fail', true, false);
          "`,
          'Test foreign key constraint'
        );
        
        testResult.warnings.push('Foreign key constraint not enforced');
      } catch (error) {
        // Expected to fail due to foreign key constraint
        logger.info('Foreign key constraint working correctly');
      }

      // Verify data retrieval
      const { stdout: userData } = await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SELECT COUNT(*) as count FROM users;"`,
        'Verify user data'
      );

      const userCount = parseInt(userData.match(/(\d+)/)?.[1] || '0');
      testResult.details.userCount = userCount;

      const { stdout: questionnaireData } = await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SELECT COUNT(*) as count FROM questionnaires;"`,
        'Verify questionnaire data'
      );

      const questionnaireCount = parseInt(questionnaireData.match(/(\d+)/)?.[1] || '0');
      testResult.details.questionnaireCount = questionnaireCount;

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = userCount === 2 && questionnaireCount === 2;

      logger.info('Data integrity test completed', {
        userCount,
        questionnaireCount,
        success: testResult.success
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error('Data integrity test failed:', error);
    }

    this.testResults.integrityTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Test migration performance impact
   */
  async testMigrationPerformance() {
    const testResult = {
      test: 'Migration Performance Impact',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: [],
      details: {}
    };

    try {
      logger.info('Testing migration performance impact');

      // Measure database performance before migrations
      const beforePerf = await this.measureDatabasePerformance();
      testResult.details.beforeMigration = beforePerf;

      // Run all migrations
      const migrationFiles = await this.getMigrationFiles();
      for (const migrationFile of migrationFiles) {
        await this.testMigrationExecution(migrationFile);
      }

      // Measure database performance after migrations
      const afterPerf = await this.measureDatabasePerformance();
      testResult.details.afterMigration = afterPerf;

      // Compare performance
      const performanceImpact = {
        queryTimeIncrease: afterPerf.averageQueryTime - beforePerf.averageQueryTime,
        connectionTimeIncrease: afterPerf.connectionTime - beforePerf.connectionTime
      };

      testResult.details.performanceImpact = performanceImpact;

      // Check if performance impact is acceptable
      const maxAcceptableIncrease = 100; // 100ms
      const isPerformanceAcceptable = performanceImpact.queryTimeIncrease <= maxAcceptableIncrease;

      if (!isPerformanceAcceptable) {
        testResult.warnings.push(`Query time increased by ${performanceImpact.queryTimeIncrease}ms, which exceeds acceptable threshold`);
      }

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = isPerformanceAcceptable;

      logger.info('Migration performance test completed', {
        performanceImpact,
        success: testResult.success
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error('Migration performance test failed:', error);
    }

    this.testResults.performanceTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Measure database performance
   */
  async measureDatabasePerformance() {
    const measurements = {
      connectionTime: 0,
      queryTime: 0,
      averageQueryTime: 0
    };

    try {
      // Measure connection time
      const connectionStart = Date.now();
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SELECT 1;"`,
        'Test connection'
      );
      measurements.connectionTime = Date.now() - connectionStart;

      // Measure query time
      const queryTimes = [];
      for (let i = 0; i < 5; i++) {
        const queryStart = Date.now();
        await this.executeCommand(
          `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${this.testDatabase}';"`,
          `Test query ${i + 1}`
        );
        queryTimes.push(Date.now() - queryStart);
      }

      measurements.queryTime = queryTimes.reduce((sum, time) => sum + time, 0);
      measurements.averageQueryTime = measurements.queryTime / queryTimes.length;

    } catch (error) {
      logger.error('Failed to measure database performance:', error);
    }

    return measurements;
  }

  /**
   * Test migrations with existing data
   */
  async testWithExistingData() {
    const testResult = {
      test: 'Migration with Existing Data',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      error: null,
      warnings: [],
      details: {}
    };

    try {
      logger.info('Testing migrations with existing data');

      // Create some existing data structure
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "
          CREATE TABLE IF NOT EXISTS old_users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        "`,
        'Create old table structure'
      );

      // Insert existing data
      await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "
          INSERT INTO old_users (email, name) VALUES 
          ('existing1@example.com', 'Existing User 1'),
          ('existing2@example.com', 'Existing User 2');
        "`,
        'Insert existing data'
      );

      // Run migrations
      const migrationFiles = await this.getMigrationFiles();
      for (const migrationFile of migrationFiles) {
        await this.testMigrationExecution(migrationFile);
      }

      // Verify data migration
      const { stdout: userCount } = await this.executeCommand(
        `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.testDatabase} -e "SELECT COUNT(*) as count FROM users;"`,
        'Verify migrated data'
      );

      const count = parseInt(userCount.match(/(\d+)/)?.[1] || '0');
      testResult.details.migratedUserCount = count;

      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = count >= 2; // At least the existing users should be there

      logger.info('Migration with existing data test completed', {
        migratedUserCount: count,
        success: testResult.success
      });

    } catch (error) {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      testResult.success = false;
      testResult.error = error.message;

      logger.error('Migration with existing data test failed:', error);
    }

    this.testResults.integrityTests.push(testResult);
    this.testResults.summary.total++;
    
    if (testResult.success) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }

    return testResult;
  }

  /**
   * Run complete migration test suite
   */
  async runCompleteTestSuite() {
    try {
      logger.info('Starting complete migration test suite');

      // Create test database
      await this.createTestDatabase();

      // Get migration files
      const migrationFiles = await this.getMigrationFiles();
      logger.info(`Found ${migrationFiles.length} migration files`);

      // Test migration execution
      for (const migrationFile of migrationFiles) {
        await this.testMigrationExecution(migrationFile);
      }

      // Test rollback for each migration
      for (let i = migrationFiles.length - 1; i >= 0; i--) {
        await this.testMigrationRollback(migrationFiles[i]);
      }

      // Re-run migrations for other tests
      for (const migrationFile of migrationFiles) {
        await this.testMigrationExecution(migrationFile);
      }

      // Verify database schema
      await this.verifyDatabaseSchema();

      // Test data integrity
      await this.testDataIntegrity();

      // Test performance impact
      await this.testMigrationPerformance();

      // Test with existing data
      await this.testWithExistingData();

      // Generate test report
      const report = this.generateTestReport();

      logger.info('Migration test suite completed', {
        summary: this.testResults.summary
      });

      return report;

    } catch (error) {
      logger.error('Migration test suite failed:', error);
      throw error;
    } finally {
      // Clean up test database
      try {
        await this.dropTestDatabase();
      } catch (error) {
        logger.error('Failed to drop test database:', error);
      }
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testDatabase: this.testDatabase,
      summary: this.testResults.summary,
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for failed tests
    if (this.testResults.summary.failed > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'FAILED_TESTS',
        message: `${this.testResults.summary.failed} tests failed. Review and fix failing migrations before deploying.`
      });
    }

    // Check for warnings
    if (this.testResults.summary.warnings > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'WARNINGS',
        message: `${this.testResults.summary.warnings} warnings generated. Review warnings for potential issues.`
      });
    }

    // Check performance impact
    const perfTest = this.testResults.performanceTests[0];
    if (perfTest && perfTest.details.performanceImpact) {
      const impact = perfTest.details.performanceImpact;
      if (impact.queryTimeIncrease > 50) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'PERFORMANCE',
          message: `Migration increased query time by ${impact.queryTimeIncrease}ms. Consider optimizing migration.`
        });
      }
    }

    // Check rollback tests
    const failedRollbacks = this.testResults.rollbackTests.filter(test => !test.success);
    if (failedRollbacks.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'ROLLBACK',
        message: `${failedRollbacks.length} rollback tests failed. Rollback functionality is critical for production safety.`
      });
    }

    return recommendations;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'test-all';
  
  const tester = new MigrationTester();
  
  try {
    switch (command) {
      case 'test-all':
        const report = await tester.runCompleteTestSuite();
        console.log(JSON.stringify(report, null, 2));
        
        // Exit with appropriate code
        process.exit(report.summary.failed > 0 ? 1 : 0);
        break;
        
      default:
        console.error('Unknown command:', command);
        console.log('Available commands: test-all');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationTester;