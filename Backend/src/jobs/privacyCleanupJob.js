'use strict';

const cron = require('node-cron');
const privacyService = require('../services/privacyService');
const logger = require('../utils/logger');

/**
 * Privacy Cleanup Job
 * Scheduled task for automatic data cleanup based on retention policies
 */

class PrivacyCleanupJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.schedule = process.env.PRIVACY_CLEANUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    this.enabled = process.env.PRIVACY_CLEANUP_ENABLED === 'true';
  }

  /**
   * Start the privacy cleanup job
   */
  start() {
    if (!this.enabled) {
      logger.info('Privacy cleanup job is disabled');
      return;
    }

    if (cron.validate(this.schedule)) {
      cron.schedule(this.schedule, async () => {
        await this.executeCleanup();
      });

      logger.info(`Privacy cleanup job scheduled with cron: ${this.schedule}`);
      this.updateNextRun();
    } else {
      logger.error(`Invalid cron schedule: ${this.schedule}`);
    }
  }

  /**
   * Execute the privacy cleanup
   * @returns {Promise<Object>} Cleanup results
   */
  async executeCleanup() {
    if (this.isRunning) {
      logger.warn('Privacy cleanup job is already running, skipping this execution');
      return { skipped: true, reason: 'Already running' };
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      logger.info('Starting scheduled privacy cleanup job...');

      const results = await privacyService.cleanupExpiredData();

      logger.info('Scheduled privacy cleanup completed:', results);

      // Update next run time
      this.updateNextRun();

      return results;

    } catch (error) {
      logger.error('Error in scheduled privacy cleanup job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update the next run time
   */
  updateNextRun() {
    // Simple calculation for next run (daily at 2 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    this.nextRun = tomorrow;
  }

  /**
   * Get job status
   * @returns {Object} Job status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      schedule: this.schedule,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
    };
  }

  /**
   * Run cleanup manually
   * @returns {Promise<Object>} Cleanup results
   */
  runManually() {
    logger.info('Manual privacy cleanup triggered');
    return this.executeCleanup();
  }
}

// Create singleton instance
const privacyCleanupJob = new PrivacyCleanupJob();

module.exports = privacyCleanupJob;