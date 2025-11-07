'use strict';

const { Response, Answer, Questionnaire, Question } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Time Period Comparison Service
 * Provides time-period comparison analytics with trend calculations
 */

/**
 * Get time-period comparison analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} Time-period comparison data
 */
const getTimePeriodComparison = async (questionnaireId, options = {}) => {
  try {
    const {
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
      comparison_type = 'week_over_week', // 'week_over_week' or 'custom'
    } = options;

    logger.info(`Generating time-period comparison for questionnaire ${questionnaireId}`);

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId },
      attributes: ['id', 'title', 'categoryMapping'],
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found`);
    }

    // Determine date ranges
    const { currentRange, previousRange } = determineDateRanges(
      comparison_type,
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
    );

    // Validate date ranges
    if (!isValidDateRange(currentRange) || !isValidDateRange(previousRange)) {
      throw new Error('Invalid date range for time-period comparison');
    }

    // Get analytics for both periods
    const currentAnalytics = await getPeriodAnalytics(questionnaireId, questionnaire.categoryMapping, currentRange);
    const previousAnalytics = await getPeriodAnalytics(questionnaireId, questionnaire.categoryMapping, previousRange);

    // Calculate comparisons and trends
    const comparison = calculatePeriodComparison(currentAnalytics, previousAnalytics);

    // Format response
    const timeComparison = {
      questionnaire_id: questionnaireId,
      comparison_type,
      current_period: {
        start: currentRange.start.toISOString().split('T')[0],
        end: currentRange.end.toISOString().split('T')[0],
        analytics: currentAnalytics,
      },
      previous_period: {
        start: previousRange.start.toISOString().split('T')[0],
        end: previousRange.end.toISOString().split('T')[0],
        analytics: previousAnalytics,
      },
      comparison_metrics: comparison,
      generated_at: new Date().toISOString(),
    };

    logger.info(`Time-period comparison generated for questionnaire ${questionnaireId}`, {
      comparison_type,
      currentResponses: currentAnalytics.total_responses,
      previousResponses: previousAnalytics.total_responses,
    });

    return timeComparison;

  } catch (error) {
    logger.error(`Error generating time-period comparison for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Determine date ranges for comparison
 * @param {string} comparisonType - Type of comparison
 * @param {string} currentPeriodStart - Custom current period start
 * @param {string} currentPeriodEnd - Custom current period end
 * @param {string} previousPeriodStart - Custom previous period start
 * @param {string} previousPeriodEnd - Custom previous period end
 * @returns {Object} Date ranges for current and previous periods
 */
const determineDateRanges = (comparison_type, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd) => {
  const now = new Date();

  if (comparison_type === 'custom') {
    // Use custom date ranges
    return {
      currentRange: {
        start: new Date(currentPeriodStart),
        end: new Date(currentPeriodEnd),
      },
      previousRange: {
        start: new Date(previousPeriodStart),
        end: new Date(previousPeriodEnd),
      },
    };
  }

  // Default to week-over-week comparison
  const currentEnd = new Date(now);
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const duration = currentEnd - currentStart;

  return {
    currentRange: {
      start: currentStart,
      end: currentEnd,
    },
    previousRange: {
      start: new Date(currentStart.getTime() - duration),
      end: new Date(currentEnd.getTime() - duration),
    },
  };
};

/**
 * Validate date range
 * @param {Object} dateRange - Date range object
 * @returns {boolean} Whether the date range is valid
 */
const isValidDateRange = (dateRange) => {
  if (!dateRange.start || !dateRange.end) {
    return false;
  }

  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);

  return start < end && start <= new Date() && end <= new Date();
};

/**
 * Get analytics for a specific period
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping
 * @param {Object} dateRange - Date range
 * @returns {Promise<Object>} Period analytics
 */
const getPeriodAnalytics = async (questionnaireId, categoryMapping, dateRange) => {
  const dateFilter = {
    [Op.gte]: dateRange.start,
    [Op.lte]: dateRange.end,
  };

  // Get total responses
  const totalResponses = await Response.count({
    where: {
      questionnaireId,
      responseDate: dateFilter,
    },
  });

  // Get category analytics
  const categories = await getCategoryPeriodAnalytics(questionnaireId, categoryMapping, dateFilter);

  // Calculate overall metrics
  const overallRating = categories.length > 0 ?
    Math.round((categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length) * 100) / 100 : 0;

  return {
    total_responses: totalResponses,
    categories,
    overall_rating: overallRating,
    period_days: Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)),
  };
};

/**
 * Get category analytics for a period
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<Array>} Category analytics
 */
const getCategoryPeriodAnalytics = async (questionnaireId, categoryMapping, dateFilter) => {
  // Get answers with questions and responses for the period
  const answers = await Answer.findAll({
    attributes: ['ratingScore', 'isSkipped'],
    include: [
      {
        model: Question,
        as: 'question',
        attributes: ['category'],
        where: { questionnaireId },
      },
      {
        model: Response,
        as: 'response',
        attributes: ['id'],
        where: {
          responseDate: dateFilter,
        },
      },
    ],
    where: {
      isSkipped: false,
      validationStatus: 'valid',
    },
    raw: false,
  });

  // Group by category
  const categoryStats = {};

  answers.forEach(answer => {
    const category = answer.question?.category || 'uncategorized';
    const improvementArea = getImprovementArea(category, categoryMapping);

    if (!categoryStats[improvementArea]) {
      categoryStats[improvementArea] = {
        name: improvementArea,
        totalRating: 0,
        ratingCount: 0,
        responseCount: new Set(),
      };
    }

    if (answer.ratingScore && answer.ratingScore > 0) {
      categoryStats[improvementArea].totalRating += parseFloat(answer.ratingScore);
      categoryStats[improvementArea].ratingCount++;
    }

    if (answer.response) {
      categoryStats[improvementArea].responseCount.add(answer.response.id);
    }
  });

  // Convert to array and calculate averages
  return Object.values(categoryStats).map(stat => ({
    name: stat.name,
    rating: stat.ratingCount > 0 ? Math.round((stat.totalRating / stat.ratingCount) * 100) / 100 : 0,
    response_count: stat.responseCount.size,
  }));
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
 * Calculate period comparison metrics
 * @param {Object} currentAnalytics - Current period analytics
 * @param {Object} previousAnalytics - Previous period analytics
 * @returns {Object} Comparison metrics
 */
const calculatePeriodComparison = (currentAnalytics, previousAnalytics) => {
  // Response count comparison
  const responseChange = calculatePercentageChange(
    previousAnalytics.total_responses,
    currentAnalytics.total_responses,
  );

  // Overall rating comparison
  const ratingChange = calculatePercentageChange(
    previousAnalytics.overall_rating,
    currentAnalytics.overall_rating,
  );

  // Category-level comparisons
  const categoryComparisons = calculateCategoryComparisons(
    currentAnalytics.categories,
    previousAnalytics.categories,
  );

  // Overall trend
  const overallTrend = determineOverallTrend(responseChange, ratingChange, categoryComparisons);

  return {
    response_count_change: responseChange,
    overall_rating_change: ratingChange,
    category_comparisons: categoryComparisons,
    overall_trend: overallTrend,
    insights: generateInsights(responseChange, ratingChange, categoryComparisons),
  };
};

/**
 * Calculate percentage change between two values
 * @param {number} previousValue - Previous period value
 * @param {number} currentValue - Current period value
 * @returns {Object} Percentage change data
 */
const calculatePercentageChange = (previousValue, currentValue) => {
  if (previousValue === 0) {
    return {
      previous: previousValue,
      current: currentValue,
      change: currentValue,
      percentage_change: currentValue > 0 ? 100 : 0,
      trend: currentValue > 0 ? 'increasing' : 'stable',
    };
  }

  const change = currentValue - previousValue;
  const percentageChange = Math.round((change / previousValue) * 100 * 100) / 100;

  return {
    previous: previousValue,
    current: currentValue,
    change,
    percentage_change: percentageChange,
    trend: percentageChange > 5 ? 'increasing' : percentageChange < -5 ? 'decreasing' : 'stable',
  };
};

/**
 * Calculate category-level comparisons
 * @param {Array} currentCategories - Current period categories
 * @param {Array} previousCategories - Previous period categories
 * @returns {Array} Category comparisons
 */
const calculateCategoryComparisons = (currentCategories, previousCategories) => {
  const previousMap = {};
  previousCategories.forEach(cat => {
    previousMap[cat.name] = cat;
  });

  return currentCategories.map(current => {
    const previous = previousMap[current.name];

    if (!previous) {
      return {
        name: current.name,
        current_rating: current.rating,
        previous_rating: 0,
        rating_change: current.rating,
        rating_trend: 'new',
        current_responses: current.response_count,
        previous_responses: 0,
        response_trend: 'new',
      };
    }

    const ratingChange = calculatePercentageChange(previous.rating, current.rating);
    const responseChange = calculatePercentageChange(previous.response_count, current.response_count);

    return {
      name: current.name,
      current_rating: current.rating,
      previous_rating: previous.rating,
      rating_change: ratingChange.change,
      rating_trend: ratingChange.trend,
      current_responses: current.response_count,
      previous_responses: previous.response_count,
      response_trend: responseChange.trend,
    };
  });
};

/**
 * Determine overall trend from comparison metrics
 * @param {Object} responseChange - Response count change
 * @param {Object} ratingChange - Rating change
 * @param {Array} categoryComparisons - Category comparisons
 * @returns {string} Overall trend
 */
const determineOverallTrend = (responseChange, ratingChange, categoryComparisons) => {
  const improvingCategories = categoryComparisons.filter(cat => cat.rating_trend === 'increasing').length;
  const decliningCategories = categoryComparisons.filter(cat => cat.rating_trend === 'decreasing').length;
  const totalCategories = categoryComparisons.length;

  // Weight the factors
  let score = 0;

  // Response volume (30% weight)
  if (responseChange.trend === 'increasing') score += 0.3;
  else if (responseChange.trend === 'decreasing') score -= 0.3;

  // Overall rating (40% weight)
  if (ratingChange.trend === 'increasing') score += 0.4;
  else if (ratingChange.trend === 'decreasing') score -= 0.4;

  // Category performance (30% weight)
  if (totalCategories > 0) {
    const categoryScore = (improvingCategories - decliningCategories) / totalCategories;
    score += categoryScore * 0.3;
  }

  if (score > 0.2) return 'improving';
  if (score < -0.2) return 'declining';
  return 'stable';
};

/**
 * Generate insights from comparison data
 * @param {Object} responseChange - Response count change
 * @param {Object} ratingChange - Rating change
 * @param {Array} categoryComparisons - Category comparisons
 * @returns {Array} Insights array
 */
const generateInsights = (responseChange, ratingChange, categoryComparisons) => {
  const insights = [];

  // Response volume insights
  if (responseChange.trend === 'increasing' && responseChange.percentage_change > 20) {
    insights.push({
      type: 'positive',
      message: `Response volume increased by ${responseChange.percentage_change}% compared to previous period`,
    });
  } else if (responseChange.trend === 'decreasing' && responseChange.percentage_change < -20) {
    insights.push({
      type: 'concern',
      message: `Response volume decreased by ${Math.abs(responseChange.percentage_change)}% compared to previous period`,
    });
  }

  // Rating insights
  if (ratingChange.trend === 'increasing' && ratingChange.change > 0.3) {
    insights.push({
      type: 'positive',
      message: `Overall satisfaction rating improved by ${ratingChange.change.toFixed(1)} points`,
    });
  } else if (ratingChange.trend === 'decreasing' && ratingChange.change < -0.3) {
    insights.push({
      type: 'concern',
      message: `Overall satisfaction rating declined by ${Math.abs(ratingChange.change).toFixed(1)} points`,
    });
  }

  // Category insights
  const bestPerforming = categoryComparisons
    .filter(cat => cat.rating_trend === 'increasing')
    .sort((a, b) => b.rating_change - a.rating_change)[0];

  if (bestPerforming && bestPerforming.rating_change > 0.5) {
    insights.push({
      type: 'positive',
      message: `${bestPerforming.name} showed significant improvement with ${bestPerforming.rating_change.toFixed(1)} point increase`,
    });
  }

  const worstPerforming = categoryComparisons
    .filter(cat => cat.rating_trend === 'decreasing')
    .sort((a, b) => a.rating_change - b.rating_change)[0];

  if (worstPerforming && worstPerforming.rating_change < -0.5) {
    insights.push({
      type: 'attention',
      message: `${worstPerforming.name} needs attention with ${Math.abs(worstPerforming.rating_change).toFixed(1)} point decline`,
    });
  }

  return insights;
};

module.exports = {
  getTimePeriodComparison,
  calculatePercentageChange,
  determineOverallTrend,
  generateInsights,
};