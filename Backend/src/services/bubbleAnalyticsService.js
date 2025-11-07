'use strict';

const models = require('../models');
const { Response, Questionnaire, Answer, Question } = models;

const logger = require('../utils/logger');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

// Cache configuration
const CACHE_CONFIG = {
  analyticsTTL: 600, // 10 minutes for analytics
};

/**
 * Bubble Analytics Service
 * Provides bubble-based visualization analytics with color-coded improvement indicators
 */

/**
 * Color-coded rating thresholds
 */
const RATING_THRESHOLDS = {
  red: { min: 0, max: 2.5 },     // Poor performance
  yellow: { min: 2.5, max: 3.5 }, // Average performance
  green: { min: 3.5, max: 5 },     // Excellent performance
};

/**
 * Get bubble analytics for a questionnaire
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

    logger.info(`Generating bubble analytics for questionnaire ${questionnaireId}`);

    // Create cache key
    const cacheKey = `analytics:bubble:${questionnaireId}:${dateFrom || 'all'}:${dateTo || 'all'}:${comparisonPeriod}`;

    // Try to get from cache first
    const cachedResult = await cacheService.getCache(cacheKey);
    if (cachedResult) {
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

    // Get category analytics for current and previous periods
    const currentCategories = await getCategoryBubbleAnalytics(questionnaireId, questionnaire.categoryMapping, currentPeriodFilter);
    const previousCategories = await getCategoryBubbleAnalytics(questionnaireId, questionnaire.categoryMapping, previousPeriodFilter);

    // Calculate trends and apply color coding
    const categoriesWithTrends = calculateTrendsAndColors(currentCategories, previousCategories);

    // Calculate overall metrics
    const totalResponses = await getTotalResponses(questionnaireId, currentPeriodFilter);
    const responseRate = await calculateResponseRate(questionnaireId, currentPeriodFilter);

    // Debug: Log what we're returning


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
    logger.info(`Bubble analytics generated for questionnaire ${questionnaireId}`, {
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
    logger.error(`Error generating bubble analytics for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Get category-based bubble analytics (OPTIMIZED)
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping from questionnaire
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Array>} Category analytics array
 */
const getCategoryBubbleAnalytics = async (questionnaireId, categoryMapping, dateFilter) => {
  const startTime = Date.now();

  try {
    // OPTIMIZED: Use simpler queries to avoid complex joins
    // Step 1: Get questions for this questionnaire
    const questions = await Question.findAll({
      where: { questionnaireId },
      attributes: ['id', 'category'],
      logging: false,
    });

    if (questions.length === 0) {
      logger.debug(`No questions found for questionnaire ${questionnaireId}`);
      return [];
    }

    const categoryStats = {};

    // Step 2: Process each question separately for better performance
    for (const question of questions) {
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

      // Step 3: Get answers for this specific question with response filtering
      const answerWhereClause = {
        questionId: question.id,
        isSkipped: false,
        validationStatus: 'valid',
      };

      const answers = await Answer.findAll({
        where: answerWhereClause,
        attributes: ['ratingScore', 'responseId'],
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
        logging: false,
      });


      // Process answers for this question
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

    // Convert to array and calculate averages
    const categories = Object.values(categoryStats).map(stat => ({
      name: stat.name,
      rating: stat.ratingCount > 0 ? Math.round((stat.totalRating / stat.ratingCount) * 100) / 100 : 0,
      response_count: stat.responseCount.size,
      response_rate: 0, // Will be calculated later
      color: '', // Will be calculated later
      trend: 'stable', // Will be calculated later
    }));

    const queryTime = Date.now() - startTime;
    if (queryTime > 2000) {
      logger.warn(`OPTIMIZED Analytics query took ${queryTime}ms for questionnaire ${questionnaireId}`);
    } else {
      logger.debug(`OPTIMIZED: Processed ${categories.length} categories for questionnaire ${questionnaireId} in ${queryTime}ms`);
    }

    return categories;

  } catch (error) {
    logger.error(`Error in OPTIMIZED getCategoryBubbleAnalytics for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Get improvement area based on category mapping
 * @param {string} category - Original category
 * @param {Object} categoryMapping - Category mapping configuration
 * @returns {string} Improvement area name
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
 * @param {Array} currentCategories - Current period categories
 * @param {Array} previousCategories - Previous period categories
 * @returns {Array} Categories with trends and colors
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
 * @param {string} comparisonPeriod - Comparison period type
 * @param {string} dateFrom - Current period start date
 * @param {string} dateTo - Current period end date
 * @param {string} customDateFrom - Custom comparison start date
 * @param {string} customDateTo - Custom comparison end date
 * @returns {Object} Previous period date filter
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
 * @param {string} dateFrom - Start date
 * @param {string} dateTo - End date
 * @returns {string} Formatted date range
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
 * @param {Array} categories - Categories with trends
 * @returns {string} Overall trend
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
 * Get total responses for a questionnaire (OPTIMIZED)
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<number>} Total responses
 */
const getTotalResponses = async (questionnaireId, dateFilter) => {
  const whereClause = { questionnaireId };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.responseDate = dateFilter;
  }

  // OPTIMIZED: Simple count without debug logging for performance
  const count = await Response.count({
    where: whereClause,
    logging: false, // Disable logging for performance
  });

  return count;
};

/**
 * Calculate response rate for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<number>} Response rate (0-1)
 */
const calculateResponseRate = async (questionnaireId, dateFilter) => {
  // For now, return a placeholder. In a real implementation, this would
  // compare responses to some baseline like views or invitations
  const totalResponses = await getTotalResponses(questionnaireId, dateFilter);

  // This is a simplified calculation - in practice you'd track invitations/views
  return Math.min(totalResponses / 100, 1.0); // Normalize to max 1.0
};

/**
 * Get color-coded improvement indicator
 * @param {number} rating - Rating score
 * @returns {string} Color indicator
 */
const getColorIndicator = (rating) => {
  if (rating <= RATING_THRESHOLDS.red.max) {
    return 'red';
  } else if (rating <= RATING_THRESHOLDS.yellow.max) {
    return 'yellow';
  } else {
    return 'green';
  }
};

/**
 * Validate questionnaire for bubble analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @returns {Promise<Object>} Validation result
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

  // Category mapping is optional - analytics can work with original categories
  // if (!questionnaire.categoryMapping || Object.keys(questionnaire.categoryMapping).length === 0) {
  //   return {
  //     isValid: false,
  //     error: 'ANALYTICS_ERROR_003',
  //     message: 'Category mapping not configured for questionnaire',
  //   };
  // }

  return { isValid: true };
};

module.exports = {
  getBubbleAnalytics,
  getCategoryBubbleAnalytics,
  getColorIndicator,
  validateQuestionnaireForBubbleAnalytics,
  RATING_THRESHOLDS,
};