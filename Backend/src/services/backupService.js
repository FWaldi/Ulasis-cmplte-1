'use strict';

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const logger = require('../utils/logger');

/**
 * Database Backup and Restore Service
 * Handles automated database backups with encryption and integrity verification
 */
class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Create database backup
   */
  async createBackup(_options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupName);
      const encryptedPath = `${backupPath}.enc`;

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Get database credentials
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'ulasis_dev',
        port: process.env.DB_PORT || 3306,
      };

      // Create mysqldump command
      const dumpCommand = `mysqldump --host=${dbConfig.host} --user=${dbConfig.user} --password=${dbConfig.password} --port=${dbConfig.port} ${dbConfig.database} > "${backupPath}"`;

      // Execute backup
      await this.executeCommand(dumpCommand);

      // Encrypt the backup
      await this.encryptFile(backupPath, encryptedPath);

      // Remove unencrypted file
      await fs.unlink(backupPath);

      // Verify backup integrity
      const isValid = await this.verifyBackup(encryptedPath);
      if (!isValid) {
        throw new Error('Backup verification failed');
      }

      // Create backup metadata
      const metadata = {
        name: backupName,
        path: encryptedPath,
        size: (await fs.stat(encryptedPath)).size,
        timestamp: new Date().toISOString(),
        database: dbConfig.database,
        checksum: await this.calculateChecksum(encryptedPath),
      };

      // Save metadata (in a simple JSON file for now)
      await this.saveBackupMetadata(metadata);

      logger.info('Database backup created successfully', {
        backupName,
        size: metadata.size,
      });

      return metadata;
    } catch (error) {
      logger.error('Backup creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get list of available backups
   */
  async getBackups() {
    try {
      const metadataFiles = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of metadataFiles) {
        if (file.endsWith('.meta.json')) {
          const metadataPath = path.join(this.backupDir, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          backups.push(metadata);
        }
      }

      // Sort by timestamp descending
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      logger.error('Failed to get backups list', { error: error.message });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupName, options = {}) {
    try {
      const metadata = await this.getBackupMetadata(backupName);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      const encryptedPath = metadata.path;
      const tempPath = path.join(this.backupDir, `temp-${Date.now()}.sql`);

      // Decrypt backup
      await this.decryptFile(encryptedPath, tempPath);

      // Get database credentials
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'ulasis_dev',
        port: process.env.DB_PORT || 3306,
      };

      // Drop and recreate database if requested
      if (options.dropDatabase) {
        await this.executeCommand(`mysql --host=${dbConfig.host} --user=${dbConfig.user} --password=${dbConfig.password} --port=${dbConfig.port} -e "DROP DATABASE IF EXISTS ${dbConfig.database}; CREATE DATABASE ${dbConfig.database};"`);
      }

      // Restore from backup
      const restoreCommand = `mysql --host=${dbConfig.host} --user=${dbConfig.user} --password=${dbConfig.password} --port=${dbConfig.port} ${dbConfig.database} < "${tempPath}"`;
      await this.executeCommand(restoreCommand);

      // Clean up temp file
      await fs.unlink(tempPath);

      logger.info('Database restore completed successfully', { backupName });

      return { success: true, backupName };
    } catch (error) {
      logger.error('Database restore failed', { error: error.message, backupName });
      throw error;
    }
  }

  /**
   * Encrypt file using AES-256
   */
  async encryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    const input = await fs.readFile(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

    // Prepend IV to encrypted data
    const result = Buffer.concat([iv, encrypted]);
    await fs.writeFile(outputPath, result);
  }

  /**
   * Decrypt file using AES-256
   */
  async decryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const encrypted = await fs.readFile(inputPath);
    encrypted.slice(0, 16); // iv not used
    const data = encrypted.slice(16);

    const decipher = crypto.createDecipher(algorithm, key);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    await fs.writeFile(outputPath, decrypted);
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath) {
    try {
      // Try to decrypt and check if it's valid SQL
      const tempPath = path.join(this.backupDir, `verify-${Date.now()}.sql`);
      await this.decryptFile(backupPath, tempPath);

      const content = await fs.readFile(tempPath, 'utf8');
      const isValid = content.includes('CREATE TABLE') || content.includes('INSERT INTO');

      await fs.unlink(tempPath);
      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Save backup metadata
   */
  async saveBackupMetadata(metadata) {
    const metadataPath = path.join(this.backupDir, `${metadata.name}.meta.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Get backup metadata
   */
  async getBackupMetadata(backupName) {
    const metadataPath = path.join(this.backupDir, `${backupName}.meta.json`);
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute shell command
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, _stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Schedule automated backups
   */
  scheduleAutomatedBackups(cronExpression = '0 2 * * *') {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Schedule the backup job
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Starting scheduled backup');
          const backup = await this.createBackup();
          logger.info('Scheduled backup completed', { backupName: backup.name });

          // Clean up old backups (keep last 30 days)
          await this.cleanupOldBackups(30);
        } catch (error) {
          logger.error('Scheduled backup failed', { error: error.message });
        }
      }, {
        scheduled: false, // Don't start immediately
      });

      // Start the job
      job.start();

      logger.info('Automated backup scheduling enabled', { cronExpression });

      return {
        success: true,
        cronExpression,
        nextRun: cronExpression, // Could calculate next run time
      };
    } catch (error) {
      logger.error('Failed to schedule automated backups', { error: error.message, cronExpression });
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(retentionDays = 30) {
    try {
      const backups = await this.getBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      for (const backup of backups) {
        if (new Date(backup.timestamp) < cutoffDate) {
          await fs.unlink(backup.path);
          await fs.unlink(path.join(this.backupDir, `${backup.name}.meta.json`));
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info('Old backups cleaned up', { deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Backup cleanup error', { error: error.message });
      throw error;
    }
  }
}

module.exports = new BackupService();