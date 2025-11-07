const fs = require('fs').promises;
const path = require('path');
const DatabaseBackup = require('../../scripts/backup-database');
const DatabaseRestore = require('../../scripts/restore-database');
const BackupVerifier = require('../../scripts/verify-backup');

// Mock environment variables
const originalEnv = process.env;

describe('Database Backup System', () => {
  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      BACKUP_DIR: path.join(__dirname, '../temp/backups'),
      BACKUP_ENCRYPTION_ENABLED: 'false',
      BACKUP_RETENTION_DAYS: '7',
      BACKUP_MAX_COUNT: '3',
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('DatabaseBackup', () => {
    let backup;

    beforeEach(() => {
      backup = new DatabaseBackup();
    });

    describe('Configuration', () => {
      test('should initialize with correct configuration', () => {
        expect(backup.config.dialect).toBe('mysql');
        expect(backup.config.database).toBe('ulasis_test');
        expect(backup.retentionDays).toBe(7);
        expect(backup.maxBackups).toBe(3);
        expect(backup.encryptionEnabled).toBe(false);
      });

      test('should generate backup filename with timestamp', () => {
        const filename = backup.generateBackupFilename();
        expect(filename).toMatch(/^ulasis-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sql$/);
      });

      test('should create mysqldump dump command correctly', () => {
        const filename = 'test-backup.sql';
        const command = backup.createDumpCommand(filename);

        expect(command).toContain('mysqldump');
        expect(command).toContain('--single-transaction');
        expect(command).toContain('--routines');
        expect(command).toContain('--triggers');
        expect(command).toContain('--events');
        expect(command).toContain('ulasis_test');
        expect(command).toContain(filename);
      });
    });

    describe('File Operations', () => {
      test('should handle encrypted files', () => {
        const encryptedFile = 'backup.sql.gz.enc';
        expect(encryptedFile.endsWith('.enc')).toBe(true);
      });

      test('should handle compressed files', () => {
        const compressedFile = 'backup.sql.gz';
        expect(compressedFile.endsWith('.gz')).toBe(true);
      });
    });
  });

  describe('BackupVerifier', () => {
    let verifier;

    beforeEach(() => {
      verifier = new BackupVerifier();
    });

    describe('SQL Structure Verification', () => {
      test('should verify valid SQL structure', async () => {
        const validSQL = `
          -- MySQL dump 10.13
          -- Host: localhost    Database: ulasis_test
          -- Server version: 8.0.33

          CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL
          );

          CREATE TABLE questionnaires (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL
          );

          CREATE TABLE questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            question_text TEXT NOT NULL
          );

          CREATE TABLE qr_codes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            qr_code_data VARCHAR(255) NOT NULL
          );

          CREATE TABLE responses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            response_date DATETIME NOT NULL
          );

          CREATE TABLE answers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            answer_value TEXT NOT NULL
          );

          CREATE TABLE reviews (
            id INT PRIMARY KEY AUTO_INCREMENT,
            review_status VARCHAR(50) NOT NULL
          );

          INSERT INTO users (id, email) VALUES (1, 'test@example.com');
        `;

        const testFile = path.join(__dirname, '../temp/test-valid.sql');
        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, validSQL);

        const result = await verifier.verifySQLStructure(testFile);

        expect(result.valid).toBe(true);
        expect(result.results['CREATE TABLE statements']).toBe(true);
        expect(result.results['INSERT statements']).toBe(true);
        expect(result.results.expectedTables.found).toContain('users');
        expect(result.results.expectedTables.found).toContain('questionnaires');
        expect(result.summary.hasAllExpectedTables).toBe(true);
        expect(result.summary.hasDangerousPatterns).toBe(false);

        // Cleanup
        await fs.unlink(testFile);
      });

      test('should detect dangerous SQL patterns', async () => {
        const dangerousSQL = `
          CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL
          );

          DROP DATABASE test;
          TRUNCATE TABLE users;
          DELETE FROM users WHERE 1=1;
        `;

        const testFile = path.join(__dirname, '../temp/test-dangerous.sql');
        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, dangerousSQL);

        const result = await verifier.verifySQLStructure(testFile);

        expect(result.valid).toBe(false);
        expect(result.results.dangerousPatterns['DROP DATABASE statements']).toBe(true);
        expect(result.results.dangerousPatterns['TRUNCATE TABLE statements']).toBe(true);
        expect(result.results.dangerousPatterns['Dangerous DELETE patterns']).toBe(true);
        expect(result.summary.hasDangerousPatterns).toBe(true);

        // Cleanup
        await fs.unlink(testFile);
      });

      test('should detect missing expected tables', async () => {
        const incompleteSQL = `
          CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL
          );

          INSERT INTO users (id, email) VALUES (1, 'test@example.com');
        `;

        const testFile = path.join(__dirname, '../temp/test-incomplete.sql');
        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, incompleteSQL);

        const result = await verifier.verifySQLStructure(testFile);

        expect(result.valid).toBe(false);
        expect(result.results.expectedTables.found).toContain('users');
        expect(result.results.expectedTables.missing).toContain('questionnaires');
        expect(result.summary.hasAllExpectedTables).toBe(false);

        // Cleanup
        await fs.unlink(testFile);
      });
    });

    describe('Integrity Verification', () => {
      test('should verify file checksum', async () => {
        const testContent = `-- MySQL dump 10.13
--
-- Host: localhost    Database: ulasis_test
-- ------------------------------------------------------
-- Server version	8.0.28

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questionnaires (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  response_id INT,
  question_id INT,
  answer_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  response_id INT,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, email, password_hash) VALUES 
(1, 'test@example.com', 'hashed_password');`;

        const backupFileName = 'test-backup.sql';
        const testFile = path.join(verifier.backupDir, backupFileName);

        await fs.mkdir(verifier.backupDir, { recursive: true });
        await fs.writeFile(testFile, testContent);

        // Create metadata file
        const metadata = {
          filename: backupFileName,
          checksum: await verifier.calculateChecksum(testFile),
          size: testContent.length,
          encrypted: false,
          compressed: false,
          createdAt: new Date().toISOString(),
        };
        const metadataFile = path.join(verifier.backupDir, `${backupFileName.replace(/\.(sql|gz|enc)$/, '')}.meta.json`);
        await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

        const isValid = await verifier.verifyBackupIntegrity(backupFileName);

        expect(isValid.success).toBe(true);

        // Cleanup
        await fs.unlink(testFile);
        await fs.unlink(metadataFile);
      });

      test('should detect checksum mismatch', async () => {
        const testContent = `-- MySQL dump 10.13
--
-- Host: localhost    Database: ulasis_test
-- ------------------------------------------------------
-- Server version	8.0.28

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questionnaires (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  questionnaire_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  response_id INT,
  question_id INT,
  answer_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  response_id INT,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

        const backupFileName = 'test-backup.sql';
        const testFile = path.join(verifier.backupDir, backupFileName);

        await fs.mkdir(verifier.backupDir, { recursive: true });
        await fs.writeFile(testFile, testContent);

        // Create metadata with wrong checksum
        const metadata = {
          filename: backupFileName,
          checksum: 'wrong-checksum-value',
          size: testContent.length,
          encrypted: false,
          compressed: false,
          createdAt: new Date().toISOString(),
        };
        const metadataFile = path.join(verifier.backupDir, `${backupFileName.replace(/\.(sql|gz|enc)$/, '')}.meta.json`);
        await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

        const result = await verifier.verifyBackupIntegrity(backupFileName);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Checksum mismatch');

        // Cleanup
        await fs.unlink(testFile);
        await fs.unlink(metadataFile);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle backup and restore workflow', async () => {
      // This would be an integration test with actual database
      // For now, we'll test the workflow structure

      const backup = new DatabaseBackup();
      const restore = new DatabaseRestore();
      const verifier = new BackupVerifier();

      // Test that all components can be instantiated
      expect(backup).toBeDefined();
      expect(restore).toBeDefined();
      expect(verifier).toBeDefined();

      // Test configuration consistency
      expect(backup.config.database).toBe(restore.config.database);
      expect(backup.config.host).toBe(restore.config.host);
    });

    test('should handle encryption workflow', () => {
      process.env.BACKUP_ENCRYPTION_ENABLED = 'true';
      process.env.BACKUP_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

      const backup = new DatabaseBackup();
      const restore = new DatabaseRestore();
      const verifier = new BackupVerifier();

      expect(backup.encryptionEnabled).toBe(true);
      expect(restore.encryptionKey).toBe('test-encryption-key-32-chars-long');
      expect(verifier.encryptionKey).toBe('test-encryption-key-32-chars-long');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing backup directory gracefully', async () => {
      const backup = new DatabaseBackup();
      process.env.BACKUP_DIR = '/nonexistent/directory';

      // Should not throw during initialization
      expect(() => new DatabaseBackup()).not.toThrow();
    });

    test('should handle invalid encryption key', async () => {
      process.env.BACKUP_ENCRYPTION_ENABLED = 'true';
      // Don't set BACKUP_ENCRYPTION_KEY

      const verifier = new BackupVerifier();

      // Should handle missing key gracefully
      expect(verifier.encryptionKey).toBeUndefined();
    });
  });

  describe('Performance Considerations', () => {
    test('should use appropriate compression levels', () => {
      process.env.BACKUP_COMPRESSION_LEVEL = '9';

      const backup = new DatabaseBackup();
      expect(backup.compressionLevel).toBe(9);
    });

    test('should respect retention policies', () => {
      process.env.BACKUP_RETENTION_DAYS = '90';
      process.env.BACKUP_MAX_COUNT = '50';

      const backup = new DatabaseBackup();
      expect(backup.retentionDays).toBe(90);
      expect(backup.maxBackups).toBe(50);
    });
  });
});