'use strict';

const { Response } = require('../models'); // eslint-disable-line no-unused-vars
const { processResponse } = require('./responseService');
const { getRealTimeKPIs } = require('./analyticsService');
const logger = require('../utils/logger');
const { performance } = require('perf_hooks');

/**
 * Batch Processing Service
 * Handles high-volume response submissions with queue-based processing
 */

class BatchProcessingService {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
    this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
    this.batchTimeout = parseInt(process.env.BATCH_TIMEOUT_MS) || 300000; // 5 minutes
    this.maxConcurrentBatches = parseInt(process.env.MAX_CONCURRENT_BATCHES) || 3;
    this.activeBatches = new Set();
    this.processingMetrics = {
      totalProcessed: 0,
      totalBatches: 0,
      averageProcessingTime: 0,
      failedBatches: 0,
      queueSize: 0,
    };
    this.batchTimer = null;
    this.performanceHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Add response to batch processing queue
   * @param {number} responseId - Response ID to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Queue status
   */
  addToQueue(responseId, options = {}) {
    try {
      const queueItem = {
        responseId,
        timestamp: Date.now(),
        priority: options.priority || 'normal',
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
        options,
      };

      this.processingQueue.push(queueItem);
      this.processingMetrics.queueSize = this.processingQueue.length;

      logger.info(`Response ${responseId} added to batch processing queue. Queue size: ${this.processingQueue.length}`);

      // Start batch processing if not already running
      if (!this.isProcessing) {
        if (process.env.NODE_ENV !== 'test') {
          this.startBatchProcessor();
        }
      }

      // Auto-trigger batch if queue reaches batch size
      if (this.processingQueue.length >= this.batchSize) {
        this.processBatch();
      }

      return {
        success: true,
        queuePosition: this.processingQueue.length,
        estimatedWaitTime: this.calculateEstimatedWaitTime(),
      };

    } catch (error) {
      logger.error(`Error adding response ${responseId} to batch queue:`, error);
      throw error;
    }
  }

  /**
   * Start the batch processor
   */
  startBatchProcessor() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    logger.info('Batch processor started');

    // Set up batch timeout processing
    this.batchTimer = setInterval(() => {
      if (this.processingQueue.length > 0 && this.activeBatches.size < this.maxConcurrentBatches) {
        this.processBatch();
      }
    }, 30000); // Check every 30 seconds

    // Process initial batch if queue has items
    if (this.processingQueue.length > 0) {
      this.processBatch();
    }
  }

  /**
   * Stop the batch processor
   */
  stopBatchProcessor() {
    this.isProcessing = false;
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    logger.info('Batch processor stopped');
  }

  /**
   * Process a batch of responses
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch() {
    if (this.activeBatches.size >= this.maxConcurrentBatches) {
      logger.warn('Maximum concurrent batches reached, skipping batch processing');
      return { skipped: true, reason: 'Max concurrent batches reached' };
    }

    if (this.processingQueue.length === 0) {
      return { skipped: true, reason: 'Empty queue' };
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeBatches.add(batchId);

    const startTime = performance.now();
    const batch = this.processingQueue.splice(0, this.batchSize);
    this.processingMetrics.queueSize = this.processingQueue.length;

    logger.info(`Processing batch ${batchId} with ${batch.length} responses`);

    try {
      const results = await this.processBatchItems(batch, batchId);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Update metrics
      this.updateBatchMetrics(batch.length, processingTime, results.success);

      // Log batch completion
      logger.info(`Batch ${batchId} completed in ${processingTime.toFixed(2)}ms. Success: ${results.success}, Failed: ${results.failed}`);

      // Clean up failed items for retry
      if (results.failedItems.length > 0) {
        await this.handleFailedItems(results.failedItems);
      }

      this.activeBatches.delete(batchId);

      return {
        batchId,
        success: true,
        processed: results.success,
        failed: results.failed,
        processingTime,
        queueSize: this.processingQueue.length,
      };

    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      logger.error(`Batch ${batchId} failed after ${processingTime.toFixed(2)}ms:`, error);

      // Re-queue items for retry if they haven't exceeded max retries
      const retryableItems = batch.filter(item => item.retryCount < item.maxRetries);
      retryableItems.forEach(item => {
        item.retryCount++;
        this.processingQueue.unshift(item); // Add to front of queue
      });

      this.processingMetrics.failedBatches++;
      this.processingMetrics.queueSize = this.processingQueue.length;

      this.activeBatches.delete(batchId);

      return {
        batchId,
        success: false,
        error: error.message,
        processingTime,
        retried: retryableItems.length,
        queueSize: this.processingQueue.length,
      };
    }
  }

  /**
   * Process individual items in a batch
   * @param {Array} batch - Array of queue items
   * @param {string} batchId - Batch identifier
   * @returns {Promise<Object>} Processing results
   */
  async processBatchItems(batch, batchId) {
    const results = {
      success: 0,
      failed: 0,
      failedItems: [],
    };

    // Process items concurrently but with controlled concurrency
    const concurrencyLimit = 10;
    const chunks = this.chunkArray(batch, concurrencyLimit);

    // eslint-disable-next-line no-await-in-loop
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item) => {
        try {
          await this.processResponseItem(item, batchId);
          results.success++;
        } catch (error) {
          results.failed++;
          results.failedItems.push({
            ...item,
            error: error.message,
          });
          logger.error(`Failed to process response ${item.responseId} in batch ${batchId}:`, error);
        }
      });

      await Promise.all(chunkPromises);
    }

    return results;
  }

  /**
   * Process a single response item
   * @param {Object} item - Queue item
   * @param {string} batchId - Batch identifier
   * @returns {Promise<void>}
   */
  async processResponseItem(item, batchId) {
    const { responseId, options } = item;

    // Verify response exists
    const response = await Response.findByPk(responseId);
    if (!response) {
      throw new Error(`Response ${responseId} not found`);
    }

    // Process the response
    await processResponse(responseId, {
      batchId,
      ...options,
    });

    // Update real-time KPIs if this is the last item in a batch for a questionnaire
    if (options.updateKPIs !== false) {
      try {
        await getRealTimeKPIs(response.questionnaireId);
      } catch (kpiError) {
        logger.warn(`Failed to update KPIs for questionnaire ${response.questionnaireId}:`, kpiError);
      }
    }
  }

  /**
   * Handle failed items from a batch
   * @param {Array} failedItems - Array of failed items
   * @returns {Promise<void>}
   */
  handleFailedItems(failedItems) {
    const retryableItems = failedItems.filter(item => item.retryCount < item.maxRetries);

    if (retryableItems.length > 0) {
      logger.info(`Re-queuing ${retryableItems.length} failed items for retry`);

      // Add retry delay
      const retryDelay = Math.min(1000 * Math.pow(2, retryableItems[0].retryCount), 30000);

      setTimeout(() => {
        retryableItems.forEach(item => {
          item.retryCount++;
          this.processingQueue.unshift(item);
        });
        this.processingMetrics.queueSize = this.processingQueue.length;
      }, retryDelay);
    }

    // Log permanently failed items
    const permanentlyFailed = failedItems.filter(item => item.retryCount >= item.maxRetries);
    if (permanentlyFailed.length > 0) {
      logger.error(`${permanentlyFailed.length} items permanently failed after ${permanentlyFailed[0].maxRetries} retries`);

      // Could add notification system here for permanently failed items
      permanentlyFailed.forEach(item => {
        logger.error(`Permanently failed: Response ${item.responseId}, Error: ${item.error}`);
      });
    }
  }

  /**
   * Update batch processing metrics
   * @param {number} itemCount - Number of items processed
   * @param {number} processingTime - Processing time in milliseconds
   * @param {number} successCount - Number of successful items
   */
  updateBatchMetrics(itemCount, processingTime, successCount) {
    this.processingMetrics.totalProcessed += itemCount;
    this.processingMetrics.totalBatches++;

    // Update average processing time
    const totalProcessingTime = this.processingMetrics.averageProcessingTime * (this.processingMetrics.totalBatches - 1) + processingTime;
    this.processingMetrics.averageProcessingTime = totalProcessingTime / this.processingMetrics.totalBatches;

    // Add to performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      itemCount,
      processingTime,
      successCount,
      successRate: successCount / itemCount,
    });

    // Trim history if too large
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Calculate estimated wait time for queue
   * @returns {number} Estimated wait time in milliseconds
   */
  calculateEstimatedWaitTime() {
    if (this.processingQueue.length === 0) return 0;

    const avgProcessingTime = this.processingMetrics.averageProcessingTime || 5000; // Default 5 seconds
    const batchesAhead = Math.ceil(this.processingQueue.length / this.batchSize);

    return batchesAhead * avgProcessingTime;
  }

  /**
   * Get current batch processing status
   * @returns {Object} Current status and metrics
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.processingQueue.length,
      activeBatches: this.activeBatches.size,
      maxConcurrentBatches: this.maxConcurrentBatches,
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout,
      metrics: { ...this.processingMetrics },
      estimatedWaitTime: this.calculateEstimatedWaitTime(),
      performance: this.getPerformanceMetrics(),
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    if (this.performanceHistory.length === 0) {
      return {
        averageProcessingTime: 0,
        averageSuccessRate: 0,
        throughput: 0,
      };
    }

    const recentHistory = this.performanceHistory.slice(-10); // Last 10 batches
    const averageProcessingTime = recentHistory.reduce((sum, item) => sum + item.processingTime, 0) / recentHistory.length;
    const averageSuccessRate = recentHistory.reduce((sum, item) => sum + item.successRate, 0) / recentHistory.length;
    const throughput = this.processingMetrics.totalProcessed / (Date.now() / 1000); // Items per second since start

    return {
      averageProcessingTime,
      averageSuccessRate,
      throughput,
      recentBatches: recentHistory.length,
    };
  }

  /**
   * Configure batch processing settings
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.batchSize) {
      this.batchSize = Math.max(1, Math.min(1000, config.batchSize));
    }
    if (config.batchTimeout) {
      this.batchTimeout = Math.max(60000, config.batchTimeout); // Minimum 1 minute
    }
    if (config.maxConcurrentBatches) {
      this.maxConcurrentBatches = Math.max(1, Math.min(10, config.maxConcurrentBatches));
    }

    logger.info('Batch processing configuration updated:', {
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout,
      maxConcurrentBatches: this.maxConcurrentBatches,
    });
  }

  /**
   * Clear the processing queue
   * @returns {number} Number of items cleared
   */
  clearQueue() {
    const clearedCount = this.processingQueue.length;
    this.processingQueue = [];
    this.processingMetrics.queueSize = 0;
    logger.info(`Cleared ${clearedCount} items from batch processing queue`);
    return clearedCount;
  }

  /**
   * Force process all items in queue
   * @returns {Promise<Object>} Processing results
   */
  async forceProcessAll() {
    const itemsToProcess = [...this.processingQueue];
    this.processingQueue = [];
    this.processingMetrics.queueSize = 0;

    logger.info(`Force processing ${itemsToProcess.length} items`);

    const results = {
      batches: [],
      totalProcessed: 0,
      totalFailed: 0,
      totalSuccess: 0,
    };

    // Process in batches
    while (itemsToProcess.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const batch = itemsToProcess.splice(0, this.batchSize);
      const batchResult = await this.processBatchItems(batch, `force_batch_${Date.now()}`);

      results.totalProcessed += batch.length;
      results.totalSuccess += batchResult.success;
      results.totalFailed += batchResult.failed;

      results.batches.push({
        size: batch.length,
        success: batchResult.success,
        failed: batchResult.failed,
      });
    }

    return results;
  }

  /**
   * Utility function to chunk array
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Create singleton instance
const batchProcessingService = new BatchProcessingService();

module.exports = batchProcessingService;