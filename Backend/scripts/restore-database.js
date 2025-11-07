#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../src/utils/logger');
const { getDatabaseSecurityConfig } = require('../src/config/database-security');

/**
 * Database Restore Script
 * 
 * This script restores database backups with:
 * - Decryption support
 * - Decompression
 * - Integrity verification
 * - Rollback capabilities
 * - Safety checks
 */

class DatabaseRestore {
  constructor() {
    this.config = getDatabaseSecurityConfig();
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    this.tempDir = path.join(this.backupDir, 'temp');
  }

  /**
   * Initialize temporary directory
   */
  async initializeTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Temporary directory initialized: ${this.tempDir}`);
    } catch (error) {
      logger.error('Failed to initialize temporary directory:', error);
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
      logger.info('Temporary directory cleaned up');
    } catch (error) {
      logger.warn('Failed to cleanup temporary directory:', error);
    }
  }

  /**
   * Find backup by filename or date
   */
  async findBackup(identifier) {
    try {
      const files = await fs.readdir(this.backupDir);
      const metadataFiles = files.filter(file => file.endsWith('.meta.json'));
      
      // Search by exact filename match
      if (identifier.endsWith('.meta.json')) {
        const metadataPath = path.join(this.backupDir, identifier);
        if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
          return JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        }
      }
      
      // Search by backup filename
      for (const metadataFile of metadataFiles) {
        const metadataPath = path.join(this.backupDir, metadataFile);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        
        if (metadata.filename === identifier || metadata.filename.startsWith(identifier)) {
          return metadata;
        }
      }
      
      // Search by date pattern
      const datePattern = identifier.replace(/[-:]/g, '');
      for (const metadataFile of metadataFiles) {
        const metadataPath = path.join(this.backupDir, metadataFile);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        
        if (metadata.filename.includes(datePattern)) {
          return metadata;
        }
      }
      
      throw new Error(`Backup not found: ${identifier}`);
      
    } catch (error) {
      logger.error('Failed to find backup:', error);
      throw error;
    }
  }

  /**
   * Decrypt backup file
   */
  async decryptFile(inputFile, outputFile) {
    if (!inputFile.endsWith('.enc')) {
      return inputFile;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key required for encrypted backup');
    }

    try {
      logger.info('Decrypting backup file', { inputFile, outputFile });
      
      // Read encrypted file
      const encryptedData = await fs.readFile(inputFile);
      
      // Create decryption cipher
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      
      // Decrypt the data
      let decryptedData = decipher.update(encryptedData);
      decryptedData = Buffer.concat([decryptedData, decipher.final()]);
      
      // Write decrypted data
      await fs.writeFile(outputFile, decryptedData);
      
      logger.info('File decrypted successfully', { outputFile });
      return outputFile;
      
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt backup file - invalid encryption key?');
    }
  }

  /**
   * Decompress backup file
   */
  async decompressFile(inputFile, outputFile) {
    if (!inputFile.endsWith('.gz')) {
      return inputFile;
    }

    return new Promise((resolve, reject) => {
      const command = `gunzip -c "${inputFile}" > "${outputFile}"`;
      
      logger.info('Decompressing backup file', { inputFile, outputFile });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Decompression failed:', { error: error.message, stderr });
          reject(error);
          return;
        }
        
        logger.info('File decompressed successfully', { outputFile });
        resolve(outputFile);
      });
    });
  }

  /**
   * Verify backup integrity before restore
   */
  async verifyBackupIntegrity(backupFile, expectedChecksum) {
    try {
      logger.info('Verifying backup integrity before restore');
      
      const actualChecksum = await this.calculateChecksum(backupFile);
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Backup integrity check failed: expected ${expectedChecksum}, got ${actualChecksum}`);
      }
      
      logger.info('Backup integrity verified');
      return true;
      
    } catch (error) {
      logger.error('Backup integrity verification failed:', error);
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
   * Create backup of current database before restore
   */
  async createPreRestoreBackup() {
    try {
      logger.info('Creating pre-restore backup');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const preRestoreFile = `pre-restore-${timestamp}.sql`;
      
      const DatabaseBackup = require('./backup-database');
      const backup = new DatabaseBackup();
      
      const result = await backup.performBackup();
      
      if (result.success) {
        logger.info('Pre-restore backup created successfully', { filename: result.filename });
        return result.filename;
      } else {
        throw new Error('Failed to create pre-restore backup');
      }
      
    } catch (error) {
      logger.error('Failed to create pre-restore backup:', error);
      throw error;
    }
  }

  /**
   * Create restore command
   */
  createRestoreCommand(sqlFile) {
    let command = `mysql --host=${this.config.host}`;
    command += ` --port=${this.config.port}`;
    command += ` --user=${this.config.username}`;
    
    if (this.config.password) {
      command += ` --password=${this.config.password}`;
    }
    
    // SSL options
    if (this.config.ssl && this.config.ssl.require) {
      command += ' --ssl';
      if (this.config.ssl.ca) {
        command += ` --ssl-ca=${this.config.ssl.ca}`;
      }
      if (this.config.ssl.cert) {
        command += ` --ssl-cert=${this.config.ssl.cert}`;
      }
      if (this.config.ssl.key) {
        command += ` --ssl-key=${this.config.ssl.key}`;
      }
    }
    
    command += ` ${this.config.database} < "${sqlFile}"`;
    
    return command;
  }

  /**
   * Execute database restore
   */
  async executeRestore(sqlFile) {
    return new Promise((resolve, reject) => {
      const command = this.createRestoreCommand(sqlFile);
      
      logger.info('Starting database restore', { sqlFile });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Database restore failed:', { error: error.message, stderr });
          reject(error);
          return;
        }
        
        if (stderr) {
          logger.warn('Database restore warnings:', { stderr });
        }
        
        logger.info('Database restore completed successfully');
        resolve(stdout);
      });
    });
  }

  /**
   * Verify database after restore
   */
  async verifyRestore() {
    try {
      logger.info('Verifying database after restore');
      
      // Check if database is accessible
      const { sequelize } = require('../src/config/database');
      await sequelize.authenticate();
      
      // Check if tables exist
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = '${this.config.database}'
      `);
      
      const tableCount = results[0].table_count;
      logger.info('Database verification completed', { tableCount });
      
      return tableCount > 0;
      
    } catch (error) {
      logger.error('Database verification failed:', error);
      return false;
    }
  }

  /**
   * Perform complete restore process
   */
  async performRestore(backupIdentifier, options = {}) {
    const {
      skipPreRestoreBackup = false,
      skipVerification = false
    } = options;
    
    let tempFiles = [];
    
    try {
      logger.info('Starting database restore process', { backupIdentifier });
      
      // Initialize temporary directory
      await this.initializeTempDir();
      
      // Find backup metadata
      const metadata = await this.findBackup(backupIdentifier);
      logger.info('Found backup metadata', { filename: metadata.filename });
      
      // Create pre-restore backup unless skipped
      if (!skipPreRestoreBackup) {
        await this.createPreRestoreBackup();
      }
      
      // Prepare file paths
      const backupFile = path.join(this.backupDir, metadata.filename);
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
      
      // Verify backup integrity
      await this.verifyBackupIntegrity(currentFile, metadata.checksum);
      
      // Execute restore
      await this.executeRestore(currentFile);
      
      // Verify database after restore
      if (!skipVerification) {
        const isValid = await this.verifyRestore();
        if (!isValid) {
          throw new Error('Database verification failed after restore');
        }
      }
      
      logger.info('Database restore completed successfully', {
        backupFile: metadata.filename,
        restoredAt: new Date().toISOString()
      });
      
      return {
        success: true,
        backupFile: metadata.filename,
        restoredAt: new Date().toISOString(),
        metadata
      };
      
    } catch (error) {
      logger.error('Database restore failed:', error);
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
   * List available backups for restore
   */
  async listAvailableBackups() {
    try {
      const DatabaseBackup = require('./backup-database');
      const backup = new DatabaseBackup();
      return await backup.listBackups();
    } catch (error) {
      logger.error('Failed to list available backups:', error);
      return [];
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupIdentifier = process.argv[3];
  
  if (!command) {
    console.error('Command required');
    console.log('Available commands: restore, list');
    process.exit(1);
  }
  
  const restore = new DatabaseRestore();
  
  try {
    switch (command) {
      case 'restore':
        if (!backupIdentifier) {
          console.error('Backup identifier required');
          console.log('Usage: node restore-database.js restore <backup-filename-or-date>');
          process.exit(1);
        }
        
        const result = await restore.performRestore(backupIdentifier);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'list':
        const backups = await restore.listAvailableBackups();
        console.log(JSON.stringify(backups, null, 2));
        break;
        
      default:
        console.error('Unknown command:', command);
        console.log('Available commands: restore, list');
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

module.exports = DatabaseRestore;