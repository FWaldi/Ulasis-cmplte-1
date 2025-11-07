'use strict';

const { QRCode, Response, Questionnaire } = require('../models'); // eslint-disable-line no-unused-vars
const { generateDeviceFingerprint } = require('../utils/deviceFingerprint');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');

/**
 * QR Scan Tracking Service
 * Handles QR code scan tracking, analytics, and response association
 */
class QRScanTrackingService {
  constructor() {
    this.scanCache = new Map(); // Cache for recent scans to prevent duplicates
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  /**
   * Track QR code scan
   * @param {number} qrCodeId - QR code ID
   * @param {Object} request - Express request object
   * @param {Object} options - Additional options
   * @returns {Object} Scan tracking result
   */
  async trackScan(qrCodeId, request, options = {}) {
    try {
      const { isResponseSubmission = false } = options;

      // Validate QR code exists and is active
      const qrCode = await QRCode.findOne({
        where: {
          id: qrCodeId,
          isActive: true,
        },
        include: [
          {
            model: Questionnaire,
            as: 'questionnaire',
            attributes: ['id', 'title', 'isActive'],
          },
        ],
      });

      if (!qrCode) {
        throw new NotFoundError('QR code not found or inactive');
      }

      if (qrCode.isExpired()) {
        throw new ValidationError('QR code has expired');
      }

      // Get device fingerprint and IP
      const deviceFingerprint = generateDeviceFingerprint(request);
      const ipAddress = request.ip || request.connection.remoteAddress || request.socket.remoteAddress;
      const userAgent = request.get('User-Agent') || '';

      // Check for duplicate scan (within cache window)
      const scanKey = `${qrCodeId}-${deviceFingerprint}`;
      const cachedScan = this.scanCache.get(scanKey);

      if (cachedScan && (Date.now() - cachedScan.timestamp < this.cacheTimeout)) {
        return {
          success: true,
          isDuplicate: true,
          scanId: cachedScan.scanId,
          message: 'Scan already tracked recently',
        };
      }

      // Determine if this is a unique scan
      const isUnique = await this.isUniqueScan(qrCodeId, deviceFingerprint, ipAddress);

      // Increment scan counts
      await qrCode.incrementScan(isUnique);

      // Create scan record in cache
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.scanCache.set(scanKey, {
        scanId,
        timestamp: Date.now(),
        isUnique,
        ipAddress,
        userAgent,
      });

      // Clean old cache entries
      this.cleanScanCache();

      logger.info(`QR code scan tracked: ${qrCodeId} (unique: ${isUnique}, response: ${isResponseSubmission})`);

      return {
        success: true,
        isDuplicate: false,
        scanId,
        isUnique,
        qrCode: {
          id: qrCode.id,
          locationTag: qrCode.locationTag,
          scanCount: qrCode.scanCount,
          uniqueScans: qrCode.uniqueScans,
          lastScanAt: qrCode.lastScanAt,
        },
        questionnaire: {
          id: qrCode.questionnaire.id,
          title: qrCode.questionnaire.title,
        },
      };

    } catch (error) {
      logger.error(`Error tracking QR code scan ${qrCodeId}:`, error);
      throw error;
    }
  }

  /**
   * Check if scan is unique for this QR code
   * @param {number} qrCodeId - QR code ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @param {string} ipAddress - IP address
   * @returns {boolean} True if unique scan
   */
  async isUniqueScan(qrCodeId, deviceFingerprint, _ipAddress) {
    try {
      // Check if this device/IP has scanned this QR code before
      const existingResponse = await Response.findOne({
        where: {
          qrCodeId,
          deviceFingerprint,
        },
      });

      // Also check recent scans in cache
      const scanKey = `${qrCodeId}-${deviceFingerprint}`;
      const hasRecentScan = this.scanCache.has(scanKey);

      return !existingResponse && !hasRecentScan;
    } catch (error) {
      logger.error('Error checking unique scan:', error);
      return false; // Default to not unique on error
    }
  }

  /**
   * Get scan analytics for QR code
   * @param {number} qrCodeId - QR code ID
   * @param {Object} options - Query options
   * @returns {Object} Scan analytics
*/
  async getScanAnalytics(qrCodeId, options = {}) {
    try {
      const { dateFrom, dateTo, groupBy = 'day' } = options;

      // Validate QR code exists
      const qrCode = await QRCode.findOne({
        where: { id: qrCodeId },
        include: [
          {
            model: Questionnaire,
            as: 'questionnaire',
            attributes: ['id', 'title'],
          },
        ],
      });

      if (!qrCode) {
        throw new NotFoundError('QR code not found');
      }

      // Get response statistics for this QR code
      const responseStats = await this.getResponseStats(qrCodeId, { dateFrom, dateTo });

      // Get scan trends over time
      const scanTrends = await this.getScanTrends(qrCodeId, { dateFrom, dateTo, groupBy });

      // Get location performance if location tag exists
      let locationPerformance = null;
      if (qrCode.locationTag) {
        locationPerformance = await this.getLocationPerformance(qrCode.locationTag, { dateFrom, dateTo });
      }

      return {
        qrCode: {
          id: qrCode.id,
          locationTag: qrCode.locationTag,
          scanCount: qrCode.scanCount,
          uniqueScans: qrCode.uniqueScans,
          lastScanAt: qrCode.lastScanAt,
          createdAt: qrCode.createdAt,
        },
        questionnaire: {
          id: qrCode.questionnaire.id,
          title: qrCode.questionnaire.title,
        },
        analytics: {
          responseStats,
          scanTrends,
          locationPerformance,
          conversionRate: qrCode.scanCount > 0 ? (responseStats.totalResponses / qrCode.scanCount) * 100 : 0,
        },
      };

    } catch (error) {
      logger.error(`Error getting scan analytics for QR code ${qrCodeId}:`, error);
      throw error;
    }
  }

  /**
   * Get response statistics for QR code
   * @param {number} qrCodeId - QR code ID
   * @param {Object} options - Query options
   * @returns {Object} Response statistics
   */
  async getResponseStats(qrCodeId, options = {}) {
    const { dateFrom, dateTo } = options;

    const whereClause = { qrCodeId };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) whereClause.responseDate[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.responseDate[require('sequelize').Op.lte] = new Date(dateTo);
    }

    const [
      totalResponses,
      completeResponses,
      averageCompletionTime,
      responsesByHour,
    ] = await Promise.all([
      Response.count({ where: whereClause }),
      Response.count({ where: { ...whereClause, isComplete: true } }),
      Response.getAverageCompletionTime(qrCodeId, { dateFrom, dateTo }),
      this.getResponsesByHour(qrCodeId, { dateFrom, dateTo }),
    ]);

    return {
      totalResponses,
      completeResponses,
      incompleteResponses: totalResponses - completeResponses,
      completionRate: totalResponses > 0 ? (completeResponses / totalResponses) * 100 : 0,
      averageCompletionTime,
      responsesByHour,
    };
  }

  /**
   * Get scan trends over time
   * @param {number} qrCodeId - QR code ID
   * @param {Object} options - Query options
   * @returns {Array} Scan trends data
   */
  async getScanTrends(qrCodeId, options = {}) {
    const { dateFrom, dateTo, groupBy = 'day' } = options;

    // This would typically involve a more complex query with date grouping
    // For now, return basic trend data
    const qrCode = await QRCode.findOne({
      where: { id: qrCodeId },
      attributes: ['scanCount', 'uniqueScans', 'lastScanAt', 'createdAt'],
    });

    // Get response trends
    const responseTrends = await this.getResponseTrends(qrCodeId, { dateFrom, dateTo, groupBy });

    return {
      totalScans: qrCode.scanCount,
      uniqueScans: qrCode.uniqueScans,
      lastScanAt: qrCode.lastScanAt,
      createdAt: qrCode.createdAt,
      responseTrends,
    };
  }

  /**
   * Get response trends over time
   * @param {number} qrCodeId - QR code ID
   * @param {Object} options - Query options
   * @returns {Array} Response trends
   */
  async getResponseTrends(qrCodeId, options = {}) {
    const { dateFrom, dateTo } = options;

    const whereClause = { qrCodeId };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) whereClause.responseDate[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.responseDate[require('sequelize').Op.lte] = new Date(dateTo);
    }

    // Group responses by time period
    const responses = await Response.findAll({
      where: whereClause,
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('response_date')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('response_date'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('response_date')), 'ASC']],
      raw: true,
    });

    return responses.map(item => ({
      date: item.date,
      responses: parseInt(item.count),
    }));
  }

  /**
   * Get responses by hour of day
   * @param {number} qrCodeId - QR code ID
   * @param {Object} options - Query options
   * @returns {Array} Responses by hour
   */
  async getResponsesByHour(qrCodeId, options = {}) {
    const { dateFrom, dateTo } = options;

    const whereClause = { qrCodeId };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) whereClause.responseDate[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.responseDate[require('sequelize').Op.lte] = new Date(dateTo);
    }

    const responses = await Response.findAll({
      where: whereClause,
      attributes: [
        [require('sequelize').fn('HOUR', require('sequelize').col('response_date')), 'hour'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: [require('sequelize').fn('HOUR', require('sequelize').col('response_date'))],
      order: [[require('sequelize').fn('HOUR', require('sequelize').col('response_date')), 'ASC']],
      raw: true,
    });

    // Fill in missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      responses: 0,
    }));

    responses.forEach(item => {
      const hour = parseInt(item.hour);
      if (hour >= 0 && hour < 24) {
        hourlyData[hour].responses = parseInt(item.count);
      }
    });

    return hourlyData;
  }

  /**
   * Get location performance analytics
   * @param {string} locationTag - Location tag
   * @param {Object} options - Query options
   * @returns {Object} Location performance
   */
  async getLocationPerformance(locationTag, options = {}) {
    const { dateFrom, dateTo } = options;

    // Get all QR codes at this location
    const qrCodes = await QRCode.findAll({
      where: { locationTag },
      attributes: ['id', 'scanCount', 'uniqueScans', 'lastScanAt'],
    });

    if (qrCodes.length === 0) {
      return null;
    }

    const qrCodeIds = qrCodes.map(qr => qr.id);

    // Get response statistics for all QR codes at this location
    const whereClause = { qrCodeId: { [require('sequelize').Op.in]: qrCodeIds } };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) whereClause.responseDate[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.responseDate[require('sequelize').Op.lte] = new Date(dateTo);
    }

    const [totalResponses, completeResponses] = await Promise.all([
      Response.count({ where: whereClause }),
      Response.count({ where: { ...whereClause, isComplete: true } }),
    ]);

    const totalScans = qrCodes.reduce((sum, qr) => sum + qr.scanCount, 0);
    const totalUniqueScans = qrCodes.reduce((sum, qr) => sum + qr.uniqueScans, 0);

    return {
      locationTag,
      qrCodeCount: qrCodes.length,
      totalScans,
      totalUniqueScans,
      totalResponses,
      completeResponses,
      completionRate: totalResponses > 0 ? (completeResponses / totalResponses) * 100 : 0,
      conversionRate: totalScans > 0 ? (totalResponses / totalScans) * 100 : 0,
      averageScansPerQR: qrCodes.length > 0 ? totalScans / qrCodes.length : 0,
    };
  }

  /**
   * Get top performing locations
   * @param {Object} options - Query options
   * @returns {Array} Top locations
   */
  async getTopLocations(options = {}) {
    const { limit = 10, dateFrom, dateTo } = options;

    // Get all unique location tags
    const locations = await QRCode.findAll({
      where: {
        locationTag: { [require('sequelize').Op.ne]: null },
      },
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('location_tag')), 'locationTag']],
      raw: true,
    });

    // Process location performances in parallel
    const performancePromises = locations
      .filter(location => location.locationTag)
      .map(async (location) => {
        const performance = await this.getLocationPerformance(location.locationTag, { dateFrom, dateTo });
        return performance;
      });

    const performanceResults = await Promise.all(performancePromises);
    const locationPerformances = performanceResults.filter(performance => performance !== null);

    // Sort by total scans and return top results
    return locationPerformances
      .sort((a, b) => b.totalScans - a.totalScans)
      .slice(0, limit);
  }

  /**
   * Associate response with QR code scan
   * @param {number} responseId - Response ID
   * @param {number} qrCodeId - QR code ID
   * @param {Object} request - Express request object
   * @returns {Object} Association result
   */
  async associateResponseWithScan(responseId, qrCodeId, request) {
    try {
      // Track the scan as part of response submission
      const scanResult = await this.trackScan(qrCodeId, request, { isResponseSubmission: true });

      // Update response with QR code association if not already set
      const response = await Response.findByPk(responseId);
      if (response && !response.qrCodeId) {
        response.qrCodeId = qrCodeId;
        await response.save();
      }

      logger.info(`Response ${responseId} associated with QR code scan ${qrCodeId}`);

      return {
        success: true,
        responseId,
        qrCodeId,
        scanResult,
      };

    } catch (error) {
      logger.error(`Error associating response ${responseId} with QR code ${qrCodeId}:`, error);
      throw error;
    }
  }

  /**
   * Clean old entries from scan cache
   */
  cleanScanCache() {
    const now = Date.now();
    for (const [key, value] of this.scanCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.scanCache.delete(key);
      }
    }
  }

  /**
   * Get scan statistics summary
   * @param {Object} options - Query options
   * @returns {Object} Scan statistics summary
   */
  async getScanStatisticsSummary(options = {}) {
    const { questionnaireId, dateFrom, dateTo } = options;

    const whereClause = {};
    if (questionnaireId) {
      whereClause.questionnaireId = questionnaireId;
    }

    // Add date filtering for QR codes
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[require('sequelize').Op.lte] = new Date(dateTo);
    }

    const [totalScans, uniqueScans, totalQRs, activeQRs] = await Promise.all([
      QRCode.sum('scanCount', { where: whereClause }),
      QRCode.sum('uniqueScans', { where: whereClause }),
      QRCode.count({ where: whereClause }),
      QRCode.count({
        where: {
          ...whereClause,
          isActive: true,
          [require('sequelize').Op.or]: [
            { expiresAt: null },
            { expiresAt: { [require('sequelize').Op.gt]: new Date() } },
          ],
        },
      }),
    ]);

    return {
      totalScans: totalScans || 0,
      uniqueScans: uniqueScans || 0,
      totalQRs,
      activeQRs,
      averageScansPerQR: totalQRs > 0 ? Math.round(totalScans / totalQRs) : 0,
    };
  }
}

module.exports = new QRScanTrackingService();
