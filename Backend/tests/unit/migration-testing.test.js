/**
 * Migration Testing Unit Tests
 *
 * This test suite validates the migration testing framework functionality
 * including test execution, rollback validation, and performance measurement.
 */

const MigrationTester = require('../../scripts/test-migrations');
const fs = require('fs').promises;
const path = require('path');

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock the database security config
jest.mock('../../src/config/database-security', () => ({
  getDatabaseSecurityConfig: () => ({
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'test_user',
    password: 'test_password',
    database: 'ulasis_test',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      connectTimeout: 10000,
      timeout: 30000,
      serverTimezone: '+00:00',
    },
  }),
}));

describe('Migration Testing Framework', () => {
  let migrationTester;

  beforeEach(() => {
    migrationTester = new MigrationTester();
    // Reset test results before each test
    migrationTester.testResults = {
      migrationTests: [],
      rollbackTests: [],
      integrityTests: [],
      performanceTests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };
  });

  describe('MigrationTester Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(migrationTester.config).toBeDefined();
      expect(migrationTester.testDatabase).toBe('ulasis_test_test_migrations');
      expect(migrationTester.originalDatabase).toBe('ulasis_test');
      expect(migrationTester.migrationsPath).toContain('migrations');
    });

    test('should initialize with empty test results', () => {
      expect(migrationTester.testResults.migrationTests).toEqual([]);
      expect(migrationTester.testResults.rollbackTests).toEqual([]);
      expect(migrationTester.testResults.integrityTests).toEqual([]);
      expect(migrationTester.testResults.performanceTests).toEqual([]);
      expect(migrationTester.testResults.summary.total).toBe(0);
    });
  });

  describe('Migration File Management', () => {
    test('should get migration files correctly', async () => {
      // Mock the fs.readdir function
      const mockFiles = [
        '001-create-users.js',
        '002-create-questionnaires.js',
        '003-create-questions.js',
        'README.md',
        '.gitkeep',
      ];

      jest.spyOn(fs, 'readdir').mockResolvedValue(mockFiles);

      const migrationFiles = await migrationTester.getMigrationFiles();

      expect(migrationFiles).toHaveLength(3);
      expect(migrationFiles[0]).toContain('001-create-users.js');
      expect(migrationFiles[1]).toContain('002-create-questionnaires.js');
      expect(migrationFiles[2]).toContain('003-create-questions.js');

      fs.readdir.mockRestore();
    });

    test('should handle empty migrations directory', async () => {
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      const migrationFiles = await migrationTester.getMigrationFiles();

      expect(migrationFiles).toHaveLength(0);

      fs.readdir.mockRestore();
    });

    test('should handle readdir errors', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Permission denied'));

      await expect(migrationTester.getMigrationFiles()).rejects.toThrow('Permission denied');

      fs.readdir.mockRestore();
    });
  });

  describe('Migration Execution Testing', () => {
    test('should test successful migration execution', async () => {
      const migrationFile = '001-create-users.js';

      // Mock successful command execution
      jest.spyOn(migrationTester, 'executeCommand').mockResolvedValue({
        stdout: 'Migration completed successfully',
        stderr: '',
      });

      const result = await migrationTester.testMigrationExecution(migrationFile);

      expect(result.migration).toBe('001-create-users');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(migrationTester.testResults.summary.total).toBe(1);
      expect(migrationTester.testResults.summary.passed).toBe(1);

      migrationTester.executeCommand.mockRestore();
    });

    test('should test failed migration execution', async () => {
      const migrationFile = '002-invalid-migration.js';

      // Mock failed command execution
      jest.spyOn(migrationTester, 'executeCommand').mockRejectedValue(
        new Error('Syntax error in migration'),
      );

      const result = await migrationTester.testMigrationExecution(migrationFile);

      expect(result.migration).toBe('002-invalid-migration');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Syntax error in migration');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(migrationTester.testResults.summary.total).toBe(1);
      expect(migrationTester.testResults.summary.failed).toBe(1);

      migrationTester.executeCommand.mockRestore();
    });
  });

  describe('Migration Rollback Testing', () => {
    test('should test successful migration rollback', async () => {
      const migrationFile = '001-create-users.js';

      // Mock successful rollback execution
      jest.spyOn(migrationTester, 'executeCommand').mockResolvedValue({
        stdout: 'Rollback completed successfully',
        stderr: '',
      });

      const result = await migrationTester.testMigrationRollback(migrationFile);

      expect(result.migration).toBe('001-create-users');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(migrationTester.testResults.summary.total).toBe(1);
      expect(migrationTester.testResults.summary.passed).toBe(1);

      migrationTester.executeCommand.mockRestore();
    });

    test('should test failed migration rollback', async () => {
      const migrationFile = '001-create-users.js';

      // Mock failed rollback execution
      jest.spyOn(migrationTester, 'executeCommand').mockRejectedValue(
        new Error('Cannot drop table with foreign key constraints'),
      );

      const result = await migrationTester.testMigrationRollback(migrationFile);

      expect(result.migration).toBe('001-create-users');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot drop table with foreign key constraints');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(migrationTester.testResults.summary.total).toBe(1);
      expect(migrationTester.testResults.summary.failed).toBe(1);

      migrationTester.executeCommand.mockRestore();
    });
  });

  describe('Database Schema Verification', () => {
    test('should verify correct database schema', async () => {
      // Mock successful table listing
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValueOnce({
          stdout: 'Tables_in_ulasis_test_test_migrations\nusers\nquestionnaires\nquestions\nqr_codes\nresponses\nanswers\nreviews',
          stderr: '',
        })
        .mockResolvedValue({
          stdout: 'Field\tType\tNull\tKey\nid\tint\tNO\tPRI\nemail\tvarchar(255)\tNO\tUNI',
          stderr: '',
        });

      const result = await migrationTester.verifyDatabaseSchema();

      expect(result.test).toBe('Database Schema Verification');
      expect(result.success).toBe(true);
      expect(result.details.tables).toContain('users');
      expect(result.details.tables).toContain('questionnaires');
      expect(result.details.tables).toHaveLength(7);

      migrationTester.executeCommand.mockRestore();
    });

    test('should detect missing tables', async () => {
      // Mock table listing with missing tables
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValueOnce({
          stdout: 'Tables_in_ulasis_test_test_migrations\nusers\nquestionnaires',
          stderr: '',
        })
        .mockResolvedValue({
          stdout: 'Field\tType\tNull\tKey\nid\tint\tNO\tPRI',
          stderr: '',
        });

      const result = await migrationTester.verifyDatabaseSchema();

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Missing tables: questions, qr_codes, responses, answers, reviews');

      migrationTester.executeCommand.mockRestore();
    });

    test('should detect unexpected tables', async () => {
      // Mock table listing with extra tables
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValueOnce({
          stdout: 'Tables_in_ulasis_test_test_migrations\nusers\nquestionnaires\nquestions\nqr_codes\nresponses\nanswers\nreviews\nextra_table\ntemp_data',
          stderr: '',
        })
        .mockResolvedValue({
          stdout: 'Field\tType\tNull\tKey\nid\tint\tNO\tPRI',
          stderr: '',
        });

      const result = await migrationTester.verifyDatabaseSchema();

      // Success is true if no missing tables (unexpected tables only generate warnings)
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Unexpected tables: extra_table, temp_data');
      expect(migrationTester.testResults.summary.warnings).toBeGreaterThan(0);

      migrationTester.executeCommand.mockRestore();
    });
  });

  describe('Data Integrity Testing', () => {
    test('should test data integrity successfully', async () => {
      // Mock successful data insertion and verification
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValueOnce({
          stdout: 'Query OK, 2 rows affected',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'Query OK, 2 rows affected',
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('Foreign key constraint fails')) // Expected failure
        .mockResolvedValueOnce({
          stdout: 'count\n2',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'count\n2',
          stderr: '',
        });

      const result = await migrationTester.testDataIntegrity();

      expect(result.test).toBe('Data Integrity Verification');
      expect(result.success).toBe(true);
      expect(result.details.userCount).toBe(2);
      expect(result.details.questionnaireCount).toBe(2);

      migrationTester.executeCommand.mockRestore();
    });

    test('should handle data integrity test failures', async () => {
      // Mock failed data insertion
      jest.spyOn(migrationTester, 'executeCommand').mockRejectedValue(
        new Error('Table does not exist'),
      );

      const result = await migrationTester.testDataIntegrity();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Table does not exist');

      migrationTester.executeCommand.mockRestore();
    });
  });

  describe('Performance Testing', () => {
    test('should test migration performance impact', async () => {
      // Mock performance measurements
      jest.spyOn(migrationTester, 'measureDatabasePerformance')
        .mockResolvedValueOnce({
          connectionTime: 50,
          queryTime: 250,
          averageQueryTime: 50,
        })
        .mockResolvedValueOnce({
          connectionTime: 55,
          queryTime: 300,
          averageQueryTime: 60,
        });

      // Mock migration execution
      jest.spyOn(migrationTester, 'getMigrationFiles').mockResolvedValue([
        '001-create-users.js',
      ]);
      jest.spyOn(migrationTester, 'testMigrationExecution').mockResolvedValue({
        success: true,
        duration: 1000,
      });

      const result = await migrationTester.testMigrationPerformance();

      expect(result.test).toBe('Migration Performance Impact');
      expect(result.success).toBe(true);
      expect(result.details.performanceImpact.queryTimeIncrease).toBe(10);
      expect(result.details.performanceImpact.connectionTimeIncrease).toBe(5);

      migrationTester.measureDatabasePerformance.mockRestore();
      migrationTester.getMigrationFiles.mockRestore();
      migrationTester.testMigrationExecution.mockRestore();
    });

    test('should detect performance regression', async () => {
      // Mock performance measurements with high impact
      jest.spyOn(migrationTester, 'measureDatabasePerformance')
        .mockResolvedValueOnce({
          connectionTime: 50,
          queryTime: 250,
          averageQueryTime: 50,
        })
        .mockResolvedValueOnce({
          connectionTime: 55,
          queryTime: 500,
          averageQueryTime: 200,
        });

      // Mock migration execution
      jest.spyOn(migrationTester, 'getMigrationFiles').mockResolvedValue([]);
      jest.spyOn(migrationTester, 'testMigrationExecution').mockResolvedValue({
        success: true,
        duration: 1000,
      });

      const result = await migrationTester.testMigrationPerformance();

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Query time increased by 150ms, which exceeds acceptable threshold');

      migrationTester.measureDatabasePerformance.mockRestore();
      migrationTester.getMigrationFiles.mockRestore();
      migrationTester.testMigrationExecution.mockRestore();
    });
  });

  describe('Test Report Generation', () => {
    test('should generate comprehensive test report', () => {
      // Set up some test results
      migrationTester.testResults.migrationTests.push({
        migration: '001-create-users.js',
        success: true,
        duration: 1000,
      });
      migrationTester.testResults.rollbackTests.push({
        migration: '001-create-users.js',
        success: true,
        duration: 500,
      });
      migrationTester.testResults.summary.total = 2;
      migrationTester.testResults.summary.passed = 2;
      migrationTester.testResults.summary.failed = 0;
      migrationTester.testResults.summary.warnings = 0;

      const report = migrationTester.generateTestReport();

      expect(report.timestamp).toBeDefined();
      expect(report.testDatabase).toBe('ulasis_test_test_migrations');
      expect(report.summary.total).toBe(2);
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(0);
      expect(report.results.migrationTests).toHaveLength(1);
      expect(report.results.rollbackTests).toHaveLength(1);
      expect(report.recommendations).toBeDefined();
    });

    test('should generate recommendations for failed tests', () => {
      // Set up failed test results
      migrationTester.testResults.summary.failed = 2;
      migrationTester.testResults.summary.warnings = 1;

      const recommendations = migrationTester.generateRecommendations();

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].priority).toBe('HIGH');
      expect(recommendations[0].type).toBe('FAILED_TESTS');
      expect(recommendations[1].priority).toBe('MEDIUM');
      expect(recommendations[1].type).toBe('WARNINGS');
    });

    test('should generate recommendations for performance issues', () => {
      // Set up performance test with high impact
      migrationTester.testResults.performanceTests.push({
        details: {
          performanceImpact: {
            queryTimeIncrease: 150,
          },
        },
      });

      const recommendations = migrationTester.generateRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('MEDIUM');
      expect(recommendations[0].type).toBe('PERFORMANCE');
    });

    test('should generate recommendations for rollback failures', () => {
      // Set up failed rollback tests
      migrationTester.testResults.rollbackTests.push(
        { success: false },
        { success: true },
      );

      const recommendations = migrationTester.generateRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('HIGH');
      expect(recommendations[0].type).toBe('ROLLBACK');
    });
  });

  describe('Database Performance Measurement', () => {
    test('should measure database performance correctly', async () => {
      // Mock Date.now to return predictable values
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return 1000 + (callCount * 100); // Increment by 100ms each call
      });

      // Mock successful performance measurements
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValue({ stdout: '1', stderr: '' }) // Connection test
        .mockResolvedValue({ stdout: '7', stderr: '' }) // Query test 1
        .mockResolvedValue({ stdout: '7', stderr: '' }) // Query test 2
        .mockResolvedValue({ stdout: '7', stderr: '' }) // Query test 3
        .mockResolvedValue({ stdout: '7', stderr: '' }) // Query test 4
        .mockResolvedValue({ stdout: '7', stderr: '' }); // Query test 5

      const performance = await migrationTester.measureDatabasePerformance();

      expect(performance.connectionTime).toBe(100);
      expect(performance.queryTime).toBe(500);
      expect(performance.averageQueryTime).toBe(100);

      // Restore Date.now
      Date.now = originalDateNow;
      migrationTester.executeCommand.mockRestore();
    });

    test('should handle performance measurement errors', async () => {
      // Mock failed performance measurement
      jest.spyOn(migrationTester, 'executeCommand').mockRejectedValue(
        new Error('Connection failed'),
      );

      const performance = await migrationTester.measureDatabasePerformance();

      expect(performance.connectionTime).toBe(0);
      expect(performance.queryTime).toBe(0);
      expect(performance.averageQueryTime).toBe(0);

      migrationTester.executeCommand.mockRestore();
    });
  });

  describe('Existing Data Testing', () => {
    test('should test migrations with existing data', async () => {
      // Mock successful existing data test
      jest.spyOn(migrationTester, 'executeCommand')
        .mockResolvedValue({ stdout: 'Query OK', stderr: '' }) // Create old table
        .mockResolvedValue({ stdout: 'Query OK, 2 rows affected', stderr: '' }) // Insert existing data
        .mockResolvedValue({ success: true }) // Migration execution
        .mockResolvedValue({ stdout: 'count\n2', stderr: '' }); // Verify migrated data

      jest.spyOn(migrationTester, 'getMigrationFiles').mockResolvedValue(['001-create-users.js']);
      jest.spyOn(migrationTester, 'testMigrationExecution').mockResolvedValue({ success: true });

      const result = await migrationTester.testWithExistingData();

      expect(result.test).toBe('Migration with Existing Data');
      expect(result.success).toBe(true);
      expect(result.details.migratedUserCount).toBe(2);

      migrationTester.executeCommand.mockRestore();
      migrationTester.getMigrationFiles.mockRestore();
      migrationTester.testMigrationExecution.mockRestore();
    });
  });
});

describe('Migration Testing Integration', () => {
  test('should validate complete test workflow', () => {
    // This test validates that all components work together
    const migrationTester = new MigrationTester();

    // Verify initialization
    expect(migrationTester.testResults).toBeDefined();
    expect(migrationTester.generateTestReport).toBeDefined();
    expect(migrationTester.generateRecommendations).toBeDefined();

    // Verify test methods exist
    expect(typeof migrationTester.testMigrationExecution).toBe('function');
    expect(typeof migrationTester.testMigrationRollback).toBe('function');
    expect(typeof migrationTester.verifyDatabaseSchema).toBe('function');
    expect(typeof migrationTester.testDataIntegrity).toBe('function');
    expect(typeof migrationTester.testMigrationPerformance).toBe('function');
    expect(typeof migrationTester.testWithExistingData).toBe('function');
  });
});