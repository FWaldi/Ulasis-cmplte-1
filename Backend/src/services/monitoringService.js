'use strict';

const os = require('os');
const { Op } = require('sequelize');
const { SystemMetric } = require('../models');
const logger = require('../utils/logger');

/**
 * System Monitoring Service
 * Collects and provides system health and performance metrics
 */
class MonitoringService {
  /**
   * Get current system health status
   */
  static async getSystemHealth() {
    try {
      const health = {
        status: 'healthy',
        uptime: os.uptime(),
        timestamp: new Date().toISOString(),
        services: {},
        system: {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          hostname: os.hostname(),
        },
      };

      // Check database connection
      try {
        const dbStart = Date.now();
        await SystemMetric.findOne({ limit: 1 });
        const dbResponseTime = Date.now() - dbStart;

        health.database = {
          status: 'connected',
          response_time: dbResponseTime,
        };
      } catch (error) {
        health.database = {
          status: 'disconnected',
          error: error.message,
        };
        health.status = 'critical';
      }

      // Check other services (placeholder)
      health.services = {
        email: 'operational', // TODO: Check actual email service
        file_upload: 'operational', // TODO: Check file system
        cache: 'operational', // TODO: Check Redis if used
      };

      // Check system resources
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

      if (memUsagePercent > 90) {
        health.status = 'critical';
      } else if (memUsagePercent > 80) {
        health.status = health.status === 'healthy' ? 'warning' : health.status;
      }

      // Get last backup info (placeholder)
      health.last_backup = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

      return health;
    } catch (error) {
      logger.error('System health check error', { error: error.message });
      return {
        status: 'critical',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Collect current system metrics
   */
  static async collectSystemMetrics() {
    try {
      const metrics = [];
      const timestamp = new Date();

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Rough percentage

      metrics.push({
        metric_type: 'cpu',
        metric_value: Math.min(cpuPercent, 100), // Cap at 100%
        unit: 'percentage',
        timestamp,
      });

      // Memory usage
      const memUsage = process.memoryUsage();
      const usedMemMB = memUsage.heapUsed / 1024 / 1024;

      metrics.push({
        metric_type: 'memory',
        metric_value: usedMemMB,
        unit: 'MB',
        timestamp,
      });

      // Disk usage (simplified - check current directory)
      // Note: In production, use a proper disk monitoring library
      metrics.push({
        metric_type: 'disk',
        metric_value: 50, // Placeholder
        unit: 'percentage',
        timestamp,
      });

      // Network (placeholder)
      metrics.push({
        metric_type: 'network',
        metric_value: 0, // Placeholder
        unit: 'MB/s',
        timestamp,
      });

      // API response time (placeholder - would be collected from middleware)
      metrics.push({
        metric_type: 'api_response_time',
        metric_value: 150, // Placeholder average
        unit: 'milliseconds',
        timestamp,
      });

      // Error rate (placeholder)
      metrics.push({
        metric_type: 'error_rate',
        metric_value: 0.5, // Placeholder percentage
        unit: 'percentage',
        timestamp,
      });

      // Save metrics to database
      await SystemMetric.bulkCreate(metrics);

      logger.debug('System metrics collected', { count: metrics.length });

      return metrics;
    } catch (error) {
      logger.error('Metrics collection error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system metrics with filtering
   */
  static async getSystemMetrics(filters = {}) {
    try {
      const {
        metric_type,
        start_date,
        end_date,
        limit = 100,
      } = filters;

      const where = {};

      if (metric_type) where.metric_type = metric_type;
      if (start_date || end_date) {
        where.timestamp = {};
        if (start_date) where.timestamp[Op.gte] = new Date(start_date);
        if (end_date) where.timestamp[Op.lte] = new Date(end_date);
      }

      const metrics = await SystemMetric.findAll({
        where,
        limit: parseInt(limit),
        order: [['timestamp', 'DESC']],
      });

      return metrics;
    } catch (error) {
      logger.error('Get system metrics error', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old metrics (retention policy)
   */
  static async cleanupOldMetrics(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await SystemMetric.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      if (deletedCount > 0) {
        logger.info('Old system metrics cleaned up', { deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Metrics cleanup error', { error: error.message });
      throw error;
    }
  }
}

module.exports = MonitoringService;