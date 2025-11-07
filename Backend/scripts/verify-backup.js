#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../src/utils/logger');

/**
 * Backup Verification Script
 * 
 * This script verifies backup integrity and tests restore procedures
 */

class BackupVerifier {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    this.tempDir = path.join(this.backupDir, 'verification-temp');
  }

  /**
   * Initialize temporary directory
   */
  async initializeTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Verification temporary directory initialized: ${this.tempDir}`);
    } catch (error) {
      logger.error('Failed to initialize verification temporary directory:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir() {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
      await fs.rmdir(this.tempDir);
      logger.info('Verification temporary directory cleaned up');
    } catch (error) {
      logger.warn('Failed to cleanup verification temporary directory:', error);
    }
  }

  /**
   * Read backup metadata
   */
  async readBackupMetadata(backupFile) {
    try {
      // Extract just the filename if a full path was provided
      const filename = path.basename(backupFile);
      const metadataFile = filename.replace(/\.(sql|gz|enc)$/, '') + '.meta.json';
      const metadataPath = path.join(this.backupDir, metadataFile);
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      return metadata;
    } catch (error) {
      logger.error('Failed to read backup metadata:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    try {
      const fileData = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileData);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Failed to calculate checksum:', error);
      throw error;
    }
  }

  /**
   * Decrypt backup file for verification
   */
  async decryptFile(inputFile, outputFile) {
    if (!inputFile.endsWith('.enc')) {
      return inputFile;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key required for encrypted backup verification');
    }

    try {
      logger.info('Decrypting backup for verification', { inputFile, outputFile });
      
      const encryptedData = await fs.readFile(inputFile);
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      
      let decryptedData = decipher.update(encryptedData);
      decryptedData = Buffer.concat([decryptedData, decipher.final()]);
      
      await fs.writeFile(outputFile, decryptedData);
      return outputFile;
      
    } catch (error) {
      logger.error('Decryption failed during verification:', error);
      throw new Error('Failed to decrypt backup - invalid encryption key?');
    }
  }

  /**
   * Decompress backup file for verification
   */
  async decompressFile(inputFile, outputFile) {
    if (!inputFile.endsWith('.gz')) {
      return inputFile;
    }

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const command = `gunzip -c "${inputFile}" > "${outputFile}"`;
      
      logger.info('Decompressing backup for verification', { inputFile, outputFile });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Decompression failed during verification:', { error: error.message, stderr });
          reject(error);
          return;
        }
        resolve(outputFile);
      });
    });
  }

  /**
   * Verify SQL syntax and structure
   */
  async verifySQLStructure(sqlFile) {
    try {
      logger.info('Verifying SQL structure');
      
      const sqlContent = await fs.readFile(sqlFile, 'utf8');
      
      // Basic SQL structure checks
      const checks = [
        { pattern: /CREATE TABLE/i, description: 'CREATE TABLE statements' },
        { pattern: /INSERT INTO/i, description: 'INSERT statements' },
        { pattern: /-- MySQL dump/i, description: 'MySQL dump header' },
        { pattern: /-- Server version/i, description: 'Server version information' }
      ];
      
      const results = {};
      for (const check of checks) {
        results[check.description] = check.pattern.test(sqlContent);
      }
      
      // Check for expected tables
      const expectedTables = [
        'users', 'questionnaires', 'questions', 'qr_codes', 
        'responses', 'answers', 'reviews'
      ];
      
      const foundTables = [];
      for (const table of expectedTables) {
        const tablePattern = new RegExp(`CREATE TABLE.*\\b${table}\\b`, 'i');
        if (tablePattern.test(sqlContent)) {
          foundTables.push(table);
        }
      }
      
      results.expectedTables = {
        found: foundTables,
        missing: expectedTables.filter(table => !foundTables.includes(table)),
        total: foundTables.length
      };
      
      // Check for dangerous SQL patterns
      const dangerousPatterns = [
        { pattern: /DROP DATABASE/i, description: 'DROP DATABASE statements' },
        { pattern: /TRUNCATE TABLE/i, description: 'TRUNCATE TABLE statements' },
        { pattern: /DELETE FROM.*WHERE.*1=1/i, description: 'Dangerous DELETE patterns' }
      ];
      
      const dangerousResults = {};
      for (const check of dangerousPatterns) {
        dangerousResults[check.description] = check.pattern.test(sqlContent);
      }
      
      results.dangerousPatterns = dangerousResults;
      
      const hasDangerousPatterns = Object.values(dangerousResults).some(found => found);
      const hasAllExpectedTables = foundTables.length === expectedTables.length;
      
      return {
        valid: !hasDangerousPatterns && hasAllExpectedTables,
        results,
        summary: {
          hasDangerousPatterns,
          hasAllExpectedTables,
          tablesFound: foundTables.length,
          tablesExpected: expectedTables.length
        }
      };
      
    } catch (error) {
      logger.error('SQL structure verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify backup file integrity
   */
  async verifyBackupIntegrity(backupIdentifier) {
    let tempFiles = [];
    
    try {
      logger.info('Starting backup integrity verification', { backupIdentifier });
      
      await this.initializeTempDir();
      
      // Find backup file
      const backupFile = path.join(this.backupDir, backupIdentifier);
      try {
        await fs.access(backupFile);
      } catch (error) {
        throw new Error(`Backup file not found: ${backupIdentifier}`);
      }
      
      // Read metadata
      const metadata = await this.readBackupMetadata(backupIdentifier);
      logger.info('Backup metadata loaded', { filename: metadata.filename });
      
      let currentFile = backupFile;
      
      // Decrypt if needed
      if (metadata.encrypted) {
        const decryptedFile = path.join(this.tempDir, `decrypted-${path.basename(metadata.filename, '.enc')}`);
        currentFile = await this.decryptFile(currentFile, decryptedFile);
        tempFiles.push(currentFile);
      }
      
      // Decompress if needed
      if (metadata.compressed) {
        const decompressedFile = path.join(this.tempDir, `decompressed-${path.basename(metadata.filename, '.gz')}`);
        currentFile = await this.decompressFile(currentFile, decompressedFile);
        tempFiles.push(currentFile);
      }
      
      // Verify checksum
      const actualChecksum = await this.calculateChecksum(currentFile);
      const checksumValid = actualChecksum === metadata.checksum;
      
      if (!checksumValid) {
        throw new Error(`Checksum mismatch: expected ${metadata.checksum}, got ${actualChecksum}`);
      }
      
      // Verify SQL structure
      const sqlVerification = await this.verifySQLStructure(currentFile);
      
      // Get file stats
      const stats = await fs.stat(backupFile);
      
      const result = {
        success: true,
        backupFile: metadata.filename,
        checksumValid,
        sqlVerification,
        fileSize: stats.size,
        metadata,
        verifiedAt: new Date().toISOString()
      };
      
      logger.info('Backup integrity verification completed', {
        filename: metadata.filename,
        checksumValid,
        sqlValid: sqlVerification.valid
      });
      
      return result;
      
    } catch (error) {
      logger.error('Backup integrity verification failed:', error);
      return {
        success: false,
        error: error.message,
        backupIdentifier
      };
    } finally {
      // Clean up temporary files
      await this.cleanupTempDir();
    }
  }

  /**
   * Test restore procedure without actually restoring
   */
  async testRestoreProcedure(backupIdentifier) {
    try {
      logger.info('Starting restore procedure test', { backupIdentifier });
      
      // First verify integrity
      const integrityResult = await this.verifyBackupIntegrity(backupIdentifier);
      if (!integrityResult.success) {
        throw new Error('Backup integrity verification failed');
      }
      
      // Test restore command syntax (dry run)
      const { getDatabaseSecurityConfig } = require('../src/config/database-security');
      const dbConfig = getDatabaseSecurityConfig();
      
      // Create a test restore command (we won't actually execute it)
      let testCommand = `mysql --host=${dbConfig.host}`;
      testCommand += ` --port=${dbConfig.port}`;
      testCommand += ` --user=${dbConfig.username}`;
      testCommand += ` --password=***`;
      testCommand += ` ${dbConfig.database} < backup-file.sql`;
      
      // Test database connection
      const { sequelize } = require('../src/config/database');
      await sequelize.authenticate();
      
      logger.info('Restore procedure test completed successfully');
      
      return {
        success: true,
        integrityCheck: integrityResult,
        databaseConnection: true,
        testCommand,
        testedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Restore procedure test failed:', error);
      return {
        success: false,
        error: error.message,
        backupIdentifier
      };
    }
  }

  /**
   * Verify all backups in the backup directory
   */
  async verifyAllBackups() {
    try {
      logger.info('Starting verification of all backups');
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('ulasis-backup-') && 
        (file.endsWith('.sql') || file.endsWith('.sql.gz') || file.endsWith('.sql.gz.enc'))
      );
      
      const results = [];
      
      for (const backupFile of backupFiles) {
        logger.info(`Verifying backup: ${backupFile}`);
        const result = await this.verifyBackupIntegrity(backupFile);
        results.push(result);
      }
      
      const summary = {
        total: backupFiles.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
      logger.info('All backups verification completed', summary);
      
      return summary;
      
    } catch (error) {
      logger.error('Failed to verify all backups:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        error: error.message
      };
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupIdentifier = process.argv[3];
  
  const verifier = new BackupVerifier();
  
  try {
    switch (command) {
      case 'verify':
        if (!backupIdentifier) {
          console.error('Backup identifier required');
          console.log('Usage: node verify-backup.js verify <backup-filename>');
          process.exit(1);
        }
        
        const result = await verifier.verifyBackupIntegrity(backupIdentifier);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'test-restore':
        if (!backupIdentifier) {
          console.error('Backup identifier required');
          console.log('Usage: node verify-backup.js test-restore <backup-filename>');
          process.exit(1);
        }
        
        const testResult = await verifier.testRestoreProcedure(backupIdentifier);
        console.log(JSON.stringify(testResult, null, 2));
        break;
        
      case 'verify-all':
        const allResults = await verifier.verifyAllBackups();
        console.log(JSON.stringify(allResults, null, 2));
        break;
        
      default:
        console.error('Unknown command:', command);
        console.log('Available commands: verify, test-restore, verify-all');
        process.exit(1);
    }
  } catch (error) {
    console.error('Command failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupVerifier;