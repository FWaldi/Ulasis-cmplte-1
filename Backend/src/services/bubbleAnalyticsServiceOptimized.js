'use strict';

const models = require('../models');
const { Response, Questionnaire, Answer, Question, sequelize } = models;
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

// Cache configuration
const CACHE_CONFIG = {
  analyticsTTL: 600, // 10 minutes for analytics
};

/**
 * Color-coded rating thresholds
 */
const RATING_THRESHOLDS = {
  red: { min: 0, max: 2.5 },     // Poor performance
  yellow: { min: 2.5, max: 3.5 }, // Average performance
  green: { min: 3.5, max: 5 },     // Excellent performance
};

/**
 * Optimized Bubble Analytics Service
 * Provides bubble-based visualization analytics with performance optimizations
 */

/**
 * Get bubble analytics for a questionnaire (OPTIMIZED)
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Analytics options
 * @returns {Promise<Object>} Bubble analytics data
 */
const getBubbleAnalytics = async (questionnaireId, options = {}) => {
  const startTime = Date.now();

  try {
    const {
      dateFrom = null,
      dateTo = null,
      comparisonPeriod = 'week', // 'week' or 'custom'
      customDateFrom = null,
      customDateTo = null,
    } = options;

    logger.info(`Generating OPTIMIZED bubble analytics for questionnaire ${questionnaireId}`);

    // Create cache key
    const cacheKey = `analytics:bubble:${questionnaireId}:${dateFrom || 'all'}:${dateTo || 'all'}:${comparisonPeriod}`;

    // Try to get from cache first
    const cachedResult = await cacheService.getCache(cacheKey);
    if (cachedResult) {
      logger.debug(`Cache hit for bubble analytics ${questionnaireId}`);
      return cachedResult;
    }

    // Verify questionnaire exists and get category mapping
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId },
      attributes: ['id', 'title', 'categoryMapping', 'userId'],
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found`);
    }

    // Get current period data
    const currentPeriodFilter = {};
    if (dateFrom) currentPeriodFilter[Op.gte] = new Date(dateFrom);
    if (dateTo) currentPeriodFilter[Op.lte] = new Date(dateTo);

    // Get previous period data for comparison
    const previousPeriodFilter = getPreviousPeriodFilter(comparisonPeriod, dateFrom, dateTo, customDateFrom, customDateTo);

    // Use optimized category analytics
    const currentCategories = await getOptimizedCategoryBubbleAnalytics(questionnaireId, questionnaire.categoryMapping, currentPeriodFilter);
    const previousCategories = await getOptimizedCategoryBubbleAnalytics(questionnaireId, questionnaire.categoryMapping, previousPeriodFilter);

    // Calculate trends and apply color coding
    const categoriesWithTrends = calculateTrendsAndColors(currentCategories, previousCategories);

    // Get total responses efficiently
    const totalResponses = await getOptimizedTotalResponses(questionnaireId, currentPeriodFilter);
    const responseRate = await calculateResponseRate(questionnaireId, currentPeriodFilter);

    // Debug: Log what we're returning
    console.log(`DEBUG ANALYTICS: totalResponses=${totalResponses}, categoriesCount=${categoriesWithTrends.length}`);

    // Ensure we have at least some default categories if none exist
    if (categoriesWithTrends.length === 0) {
      // Add default categories for better UX
      categoriesWithTrends.push(
        {
          name: 'Product Quality',
          rating: 0,
          response_count: 0,
          response_rate: 0,
          color: 'green',
          trend: 'stable',
        },
        {
          name: 'Customer Service',
          rating: 0,
          response_count: 0,
          response_rate: 0,
          color: 'green',
          trend: 'stable',
        },
        {
          name: 'User Experience',
          rating: 0,
          response_count: 0,
          response_rate: 0,
          color: 'green',
          trend: 'stable',
        },
      );
    }

    // Format response according to API specification
    const bubbleAnalytics = {
      questionnaire_id: questionnaireId,
      categories: categoriesWithTrends,
      period_comparison: {
        current_period: formatDateRange(dateFrom, dateTo),
        previous_period: formatDateRange(previousPeriodFilter[Op.gte], previousPeriodFilter[Op.lte]),
        overall_trend: calculateOverallTrend(categoriesWithTrends),
      },
      total_responses: totalResponses,
      response_rate: responseRate,
      generated_at: new Date().toISOString(),
    };

    const totalTime = Date.now() - startTime;
    logger.info(`OPTIMIZED Bubble analytics generated for questionnaire ${questionnaireId}`, {
      categoriesCount: categoriesWithTrends.length,
      totalResponses,
      responseRate,
      executionTime: `${totalTime}ms`,
    });

    // Cache the result
    try {
      await cacheService.setCache(cacheKey, bubbleAnalytics, CACHE_CONFIG.analyticsTTL);
    } catch (cacheError) {
      logger.warn('Failed to cache analytics result:', cacheError);
    }

    return bubbleAnalytics;

  } catch (error) {
    logger.error(`Error generating OPTIMIZED bubble analytics for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * OPTIMIZED: Get category-based bubble analytics using raw queries for better performance
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping from questionnaire
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Array>} Category analytics array
 */
const getOptimizedCategoryBubbleAnalytics = async (questionnaireId, categoryMapping, dateFilter) => {
  const startTime = Date.now();

  try {
    // Build WHERE conditions
    const whereConditions = [
      `q."questionnaireId" = ${questionnaireId}`,
      'a."isSkipped" = false',
      'a."validationStatus" = \'valid\'',
      'r."isComplete" = true',
    ];

    // Add date filter if provided
    if (Object.keys(dateFilter).length > 0) {
      if (dateFilter[Op.gte]) {
        whereConditions.push(`r."responseDate" >= '${dateFilter[Op.gte].toISOString()}'`);
      }
      if (dateFilter[Op.lte]) {
        whereConditions.push(`r."responseDate" <= '${dateFilter[Op.lte].toISOString()}'`);
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // Use raw SQL for better performance - this avoids complex ORM joins
    const query = `
      SELECT 
        q.category as question_category,
        COUNT(DISTINCT r.id) as response_count,
        COUNT(a.id) as answer_count,
        AVG(a."ratingScore") as avg_rating,
        SUM(a."ratingScore") as total_rating
      FROM "Answers" a
      INNER JOIN "Questions" q ON a."questionId" = q.id
      INNER JOIN "Responses" r ON a."responseId" = r.id
      WHERE ${whereClause}
      GROUP BY q.category
      ORDER BY q.category
    `;

    // Execute raw query
    const results = await sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      logging: false, // Disable logging for performance
    });

    const queryTime = Date.now() - startTime;
    if (queryTime > 2000) {
      logger.warn(`OPTIMIZED Analytics query took ${queryTime}ms for questionnaire ${questionnaireId}`);
    }

    // Process results into category format
    const categoryStats = {};

    results.forEach(row => {
      const category = row.question_category || 'uncategorized';
      const improvementArea = getImprovementArea(category, categoryMapping);

      if (!categoryStats[improvementArea]) {
        categoryStats[improvementArea] = {
          name: improvementArea,
          totalRating: 0,
          ratingCount: 0,
          responseCount: new Set(),
        };
      }

      if (row.avg_rating && row.avg_rating > 0) {
        categoryStats[improvementArea].totalRating += parseFloat(row.avg_rating) * parseInt(row.answer_count);
        categoryStats[improvementArea].ratingCount += parseInt(row.answer_count);
      }

      // Use Set to avoid counting duplicate responses
      for (let i = 0; i < parseInt(row.response_count); i++) {
        categoryStats[improvementArea].responseCount.add(`${improvementArea}-${row.question_category}-${i}`);
      }
    });

    // Convert to array and calculate averages
    const categories = Object.values(categoryStats).map(stat => ({
      name: stat.name,
      rating: stat.ratingCount > 0 ? Math.round((stat.totalRating / stat.ratingCount) * 100) / 100 : 0,
      response_count: stat.responseCount.size,
      response_rate: 0, // Will be calculated later
      color: '', // Will be calculated later
      trend: 'stable', // Will be calculated later
    }));

    logger.debug(`OPTIMIZED: Processed ${categories.length} categories for questionnaire ${questionnaireId}`);
    return categories;

  } catch (error) {
    logger.error(`Error in getOptimizedCategoryBubbleAnalytics for questionnaire ${questionnaireId}:`, error);
    // Fallback to simple implementation
    return getFallbackCategoryAnalytics(questionnaireId, categoryMapping, dateFilter);
  }
};

/**
 * Fallback category analytics using simpler queries
 */
const getFallbackCategoryAnalytics = async (questionnaireId, categoryMapping, dateFilter) => {
  try {
    // Simple approach: get questions first, then get answers for each question
    const questions = await Question.findAll({
      where: { questionnaireId },
      attributes: ['id', 'category'],
    });

    const categoryStats = {};

    for (const question of questions) {
      const whereClause = {
        questionId: question.id,
        isSkipped: false,
        validationStatus: 'valid',
      };

      // Get answers with response filtering
      const answers = await Answer.findAll({
        where: whereClause,
        include: [{
          model: Response,
          as: 'response',
          where: Object.keys(dateFilter).length > 0 ? {
            responseDate: dateFilter,
            isComplete: true,
          } : {
            isComplete: true,
          },
          attributes: ['id'],
          required: true,
        }],
        attributes: ['ratingScore', 'responseId'],
      });

      const category = question.category || 'uncategorized';
      const improvementArea = getImprovementArea(category, categoryMapping);

      if (!categoryStats[improvementArea]) {
        categoryStats[improvementArea] = {
          name: improvementArea,
          totalRating: 0,
          ratingCount: 0,
          responseCount: new Set(),
        };
      }

      answers.forEach(answer => {
        if (answer.ratingScore && answer.ratingScore > 0) {
          categoryStats[improvementArea].totalRating += parseFloat(answer.ratingScore);
          categoryStats[improvementArea].ratingCount++;
        }

        if (answer.responseId) {
          categoryStats[improvementArea].responseCount.add(answer.responseId);
        }
      });
    }

    // Convert to array format
    return Object.values(categoryStats).map(stat => ({
      name: stat.name,
      rating: stat.ratingCount > 0 ? Math.round((stat.totalRating / stat.ratingCount) * 100) / 100 : 0,
      response_count: stat.responseCount.size,
      response_rate: 0,
      color: '',
      trend: 'stable',
    }));

  } catch (error) {
    logger.error('Fallback analytics also failed:', error);
    return [];
  }
};

/**
 * OPTIMIZED: Get total responses using simple count
 */
const getOptimizedTotalResponses = async (questionnaireId, dateFilter) => {
  try {
    const whereClause = { questionnaireId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.responseDate = dateFilter;
    }

    const count = await Response.count({
      where: whereClause,
      logging: false, // Disable logging for performance
    });

    return count;
  } catch (error) {
    logger.error('Error getting total responses:', error);
    return 0;
  }
};

/**
 * Get improvement area based on category mapping
 */
const getImprovementArea = (category, categoryMapping) => {
  if (!categoryMapping || !categoryMapping[category]) {
    return category || 'uncategorized';
  }

  const mapping = categoryMapping[category];
  return mapping.improvementArea || mapping.name || category;
};

/**
 * Calculate trends and apply color coding
 */
const calculateTrendsAndColors = (currentCategories, previousCategories) => {
  const previousMap = {};
  previousCategories.forEach(cat => {
    previousMap[cat.name] = cat;
  });

  return currentCategories.map(current => {
    const previous = previousMap[current.name];

    // Calculate trend
    let trend = 'stable';
    if (previous) {
      const ratingDiff = current.rating - previous.rating;
      if (ratingDiff > 0.2) {
        trend = 'improving';
      } else if (ratingDiff < -0.2) {
        trend = 'declining';
      }
    }

    // Apply color coding based on rating
    let color = 'green';
    if (current.rating <= RATING_THRESHOLDS.red.max) {
      color = 'red';
    } else if (current.rating <= RATING_THRESHOLDS.yellow.max) {
      color = 'yellow';
    }

    return {
      ...current,
      color,
      trend,
    };
  });
};

/**
 * Get previous period filter for comparison
 */
const getPreviousPeriodFilter = (comparisonPeriod, dateFrom, dateTo, customDateFrom, customDateTo) => {
  if (comparisonPeriod === 'custom' && customDateFrom && customDateTo) {
    return {
      [Op.gte]: new Date(customDateFrom),
      [Op.lte]: new Date(customDateTo),
    };
  }

  // Default to week-over-week comparison
  if (dateFrom && dateTo) {
    const currentStart = new Date(dateFrom);
    const currentEnd = new Date(dateTo);
    const duration = currentEnd - currentStart;

    return {
      [Op.gte]: new Date(currentStart.getTime() - duration),
      [Op.lte]: new Date(currentEnd.getTime() - duration),
    };
  }

  // Default to last week if no dates provided
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return {
    [Op.gte]: twoWeeksAgo,
    [Op.lte]: oneWeekAgo,
  };
};

/**
 * Format date range for display
 */
const formatDateRange = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) {
    return 'All time';
  }

  const from = dateFrom ? new Date(dateFrom).toLocaleDateString() : 'Start';
  const to = dateTo ? new Date(dateTo).toLocaleDateString() : 'Present';

  return `${from} to ${to}`;
};

/**
 * Calculate overall trend from categories
 */
const calculateOverallTrend = (categories) => {
  if (categories.length === 0) return 'stable';

  const trendCounts = {
    improving: 0,
    declining: 0,
    stable: 0,
  };

  categories.forEach(cat => {
    trendCounts[cat.trend]++;
  });

  if (trendCounts.improving > trendCounts.declining) {
    return 'improving';
  } else if (trendCounts.declining > trendCounts.improving) {
    return 'declining';
  } else {
    return 'stable';
  }
};

/**
 * Calculate response rate for a questionnaire
 */
const calculateResponseRate = async (questionnaireId, dateFilter) => {
  const totalResponses = await getOptimizedTotalResponses(questionnaireId, dateFilter);
  // This is a simplified calculation - in practice you'd track invitations/views
  return Math.min(totalResponses / 100, 1.0); // Normalize to max 1.0
};

/**
 * Validate questionnaire for bubble analytics
 */
const validateQuestionnaireForBubbleAnalytics = async (questionnaireId) => {
  logger.info(`Validating questionnaire ${questionnaireId} for bubble analytics`);

  const questionnaire = await Questionnaire.findOne({
    where: { id: questionnaireId },
    attributes: ['id', 'categoryMapping', 'isActive'],
  });

  logger.info(`Questionnaire lookup result for ID ${questionnaireId}:`, questionnaire ? 'found' : 'not found');

  if (!questionnaire) {
    logger.info(`Questionnaire ${questionnaireId} not found, returning validation error`);
    return {
      isValid: false,
      error: 'ANALYTICS_ERROR_001',
      message: 'Invalid questionnaire ID or questionnaire not found',
    };
  }

  if (!questionnaire.isActive) {
    return {
      isValid: false,
      error: 'ANALYTICS_ERROR_002',
      message: 'Questionnaire is not active',
    };
  }

  return { isValid: true };
};

module.exports = {
  getBubbleAnalytics,
  getOptimizedCategoryBubbleAnalytics,
  getColorIndicator: (rating) => {
    if (rating <= RATING_THRESHOLDS.red.max) {
      return 'red';
    } else if (rating <= RATING_THRESHOLDS.yellow.max) {
      return 'yellow';
    } else {
      return 'green';
    }
  },
  validateQuestionnaireForBubbleAnalytics,
  RATING_THRESHOLDS,
};