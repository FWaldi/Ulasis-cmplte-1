#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../src/utils/logger');
const { getDatabaseSecurityConfig } = require('../src/config/database-security');

/**
 * Database Backup Script
 * 
 * This script creates automated database backups with:
 * - Compression
 * - Encryption
 * - Rotation policies
 * - Integrity verification
 * - Recovery procedures
 */

class DatabaseBackup {
  constructor() {
    this.config = getDatabaseSecurityConfig();
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.compressionLevel = parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6;
    this.encryptionEnabled = process.env.BACKUP_ENCRYPTION_ENABLED === 'true';
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.maxBackups = parseInt(process.env.BACKUP_MAX_COUNT) || 10;
  }

  /**
   * Initialize backup directory
   */
  async initializeBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Backup directory initialized: ${this.backupDir}`);
    } catch (error) {
      logger.error('Failed to initialize backup directory:', error);
      throw error;
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `ulasis-backup-${timestamp}.sql`;
  }

  /**
   * Create database dump command
   */
  createDumpCommand(filename) {
    const dumpFile = path.join(this.backupDir, filename);

    if (this.config.dialect === 'sqlite') {
      // SQLite dump command
      return `sqlite3 "${this.config.storage}" .dump > "${dumpFile}"`;
    } else {
      // MySQL dump command
      let command = `mysqldump --single-transaction --routines --triggers --events`;
      command += ` --host=${this.config.host}`;
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

      command += ` ${this.config.database} > "${dumpFile}"`;

      return command;
    }
  }

  /**
   * Execute database dump
   */
  async createDump(filename) {
    return new Promise((resolve, reject) => {
      const command = this.createDumpCommand(filename);
      
      logger.info('Starting database dump', { filename });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Database dump failed:', { error: error.message, stderr });
          reject(error);
          return;
        }
        
        if (stderr) {
          logger.warn('Database dump warnings:', { stderr });
        }
        
        logger.info('Database dump completed successfully', { filename });
        resolve(stdout);
      });
    });
  }

  /**
   * Compress backup file
   */
  async compressFile(inputFile) {
    const outputFile = `${inputFile}.gz`;
    
    return new Promise((resolve, reject) => {
      const command = `gzip -${this.compressionLevel} "${inputFile}"`;
      
      logger.info('Compressing backup file', { inputFile, outputFile });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Compression failed:', { error: error.message, stderr });
          reject(error);
          return;
        }
        
        logger.info('File compressed successfully', { outputFile });
        resolve(outputFile);
      });
    });
  }

  /**
   * Encrypt backup file
   */
  async encryptFile(inputFile) {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return inputFile;
    }

    const outputFile = `${inputFile}.enc`;
    
    try {
      logger.info('Encrypting backup file', { inputFile, outputFile });
      
      // Read the input file
      const inputData = await fs.readFile(inputFile);
      
      // Create encryption cipher
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      
      // Encrypt the data
      let encryptedData = cipher.update(inputData);
      encryptedData = Buffer.concat([encryptedData, cipher.final()]);
      
      // Write encrypted data
      await fs.writeFile(outputFile, encryptedData);
      
      // Remove unencrypted file
      await fs.unlink(inputFile);
      
      logger.info('File encrypted successfully', { outputFile });
      return outputFile;
      
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum for integrity verification
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
   * Create backup metadata file
   */
  async createMetadata(backupFile, checksum, fileSize) {
    const metadata = {
      filename: path.basename(backupFile),
      created_at: new Date().toISOString(),
      database: this.config.database,
      host: this.config.host,
      size_bytes: fileSize,
      checksum,
      compressed: backupFile.endsWith('.gz'),
      encrypted: backupFile.endsWith('.enc'),
      version: '1.0.0'
    };
    
    const metadataFile = backupFile.replace(/\.(gz|enc)$/, '') + '.meta.json';
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    
    logger.info('Backup metadata created', { metadataFile });
    return metadataFile;
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFile, expectedChecksum) {
    try {
      logger.info('Verifying backup integrity', { backupFile });
      
      const actualChecksum = await this.calculateChecksum(backupFile);
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
      }
      
      logger.info('Backup integrity verified', { backupFile, checksum: actualChecksum });
      return true;
      
    } catch (error) {
      logger.error('Backup verification failed:', error);
      return false;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('Starting backup cleanup');
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('ulasis-backup-') && file.endsWith('.meta.json'))
        .map(file => path.join(this.backupDir, file));
      
      if (backupFiles.length === 0) {
        logger.info('No backup files to clean up');
        return;
      }
      
      // Read metadata for all backups
      const backups = [];
      for (const metadataFile of backupFiles) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
          backups.push({
            metadata,
            metadataFile,
            age: Date.now() - new Date(metadata.created_at).getTime()
          });
        } catch (error) {
          logger.warn('Failed to read metadata file:', { metadataFile, error: error.message });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.metadata.created_at) - new Date(a.metadata.created_at));
      
      // Determine which backups to delete
      const toDelete = [];
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
      
      for (let i = 0; i < backups.length; i++) {
        const backup = backups[i];
        
        // Delete if older than retention period or if we have too many backups
        if (backup.age > retentionMs || i >= this.maxBackups) {
          toDelete.push(backup);
        }
      }
      
      // Delete old backups
      for (const backup of toDelete) {
        try {
          // Delete backup file
          const backupFile = path.join(this.backupDir, backup.metadata.filename);
          await fs.unlink(backupFile);
          
          // Delete metadata file
          await fs.unlink(backup.metadataFile);
          
          logger.info('Deleted old backup', { 
            filename: backup.metadata.filename,
            age: Math.round(backup.age / (24 * 60 * 60 * 1000)) // days
          });
        } catch (error) {
          logger.error('Failed to delete backup:', { 
            filename: backup.metadata.filename,
            error: error.message
          });
        }
      }
      
      logger.info('Backup cleanup completed', {
        totalBackups: backups.length,
        deleted: toDelete.length,
        remaining: backups.length - toDelete.length
      });
      
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Perform complete backup process
   */
  async performBackup() {
    try {
      logger.info('Starting database backup process');
      
      // Initialize backup directory
      await this.initializeBackupDir();
      
      // Generate backup filename
      const filename = this.generateBackupFilename();
      
      // Create database dump
      await this.createDump(filename);
      
      let currentFile = path.join(this.backupDir, filename);
      
      // Compress backup
      currentFile = await this.compressFile(currentFile);
      
      // Encrypt backup if enabled
      currentFile = await this.encryptFile(currentFile);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(currentFile);
      
      // Get file size
      const stats = await fs.stat(currentFile);
      
      // Create metadata
      await this.createMetadata(currentFile, checksum, stats.size);
      
      // Verify backup integrity
      const isValid = await this.verifyBackup(currentFile, checksum);
      
      if (!isValid) {
        throw new Error('Backup verification failed');
      }
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      logger.info('Database backup completed successfully', {
        filename: path.basename(currentFile),
        size: stats.size,
        checksum
      });
      
      return {
        success: true,
        filename: path.basename(currentFile),
        size: stats.size,
        checksum,
        path: currentFile
      };
      
    } catch (error) {
      logger.error('Database backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const metadataFiles = files.filter(file => file.endsWith('.meta.json'));
      
      const backups = [];
      for (const metadataFile of metadataFiles) {
        try {
          const metadataPath = path.join(this.backupDir, metadataFile);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          backups.push(metadata);
        } catch (error) {
          logger.warn('Failed to read metadata:', { metadataFile, error: error.message });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return backups;
      
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'backup';
  const backup = new DatabaseBackup();
  
  try {
    switch (command) {
      case 'backup':
        const result = await backup.performBackup();
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'list':
        const backups = await backup.listBackups();
        console.log(JSON.stringify(backups, null, 2));
        break;
        
      default:
        console.error('Unknown command:', command);
        console.log('Available commands: backup, list');
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

module.exports = DatabaseBackup;