'use strict';

// Models will be imported dynamically to avoid loading issues
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { Questionnaire, Answer, Question, Response } = require('../models');

/**
 * Analytics ETL Service
 * Handles Extract, Transform, Load operations for analytics data
 */

/**
 * Calculate period date for a given date and period type
 * @param {Date} date - The date to calculate period for
 * @param {string} periodType - Period type (day, week, month, year)
 * @returns {string} Period date in YYYY-MM-DD format
 */
const getPeriodDate = (date, periodType) => {
  const d = new Date(date);

  switch (periodType) {
    case 'day':
      return d.toISOString().split('T')[0];
    case 'week': {
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    case 'year':
      return `${d.getFullYear()}-01-01`;
    default:
      return d.toISOString().split('T')[0];
  }
};

/**
 * Get date range for a period
 * @param {string} periodDate - Period start date
 * @param {string} periodType - Period type
 * @returns {Object} Object with startDate and endDate
 */
const getPeriodRange = (periodDate, periodType) => {
  const startDate = new Date(periodDate);

  let endDate;
  switch (periodType) {
    case 'day':
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case 'week':
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case 'month':
      endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 1);
      break;
    case 'year':
      endDate = new Date(startDate);
      endDate.setFullYear(startDate.getFullYear() + 1);
      break;
    default:
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

/**
 * Calculate KPI data for a questionnaire and period
 * @param {number} questionnaireId - Questionnaire ID
 * @param {string} periodType - Period type
 * @param {string} periodDate - Period start date
 * @returns {Object} KPI data
 */
const calculateKPIs = async (questionnaireId, periodType, periodDate) => {
  const { Response } = require('../models');
  const { startDate, endDate } = getPeriodRange(periodDate, periodType);

  // Get responses in the period
  const responses = await Response.findAll({
    where: {
      questionnaireId,
      responseDate: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
    },
    attributes: ['id', 'isComplete', 'responseDate'],
  });

  const totalResponses = responses.length;
  const completeResponses = responses.filter(r => r.isComplete).length;

  if (totalResponses === 0) {
    return {
      totalResponses: 0,
      avgRating: null,
      responseRate: null,
      positiveSentiment: null,
    };
  }

  // Get answers for the period
  const responseIds = responses.map(r => r.id);
  const answers = await Answer.findAll({
    where: {
      responseId: responseIds,
      isSkipped: false,
      ratingScore: { [Op.not]: null },
    },
    attributes: ['ratingScore'],
  });

  // Calculate average rating
  const ratings = answers.map(a => parseFloat(a.ratingScore)).filter(r => !isNaN(r));
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

  // Calculate response rate (percentage of complete responses)
  const responseRate = Math.round((completeResponses / totalResponses) * 100);

  // Calculate positive sentiment (ratings >= 4.0)
  const positiveRatings = ratings.filter(r => r >= 4.0);
  const positiveSentiment = ratings.length > 0 ? Math.round((positiveRatings.length / ratings.length) * 100) : null;

  return {
    totalResponses,
    avgRating: avgRating ? Math.round(avgRating * 100) / 100 : null,
    responseRate,
    positiveSentiment,
  };
};

/**
 * Calculate trend data for a questionnaire and period
 * @param {number} questionnaireId - Questionnaire ID
 * @param {string} periodType - Period type
 * @param {string} periodDate - Period start date
 * @returns {Array} Trend data points
 */
const calculateTrends = async (questionnaireId, periodType, periodDate) => {
  const { Response } = require('../models');
  const { startDate, endDate } = getPeriodRange(periodDate, periodType);

  // Get all dates in the period
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate < end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate data for each date
  const trendData = [];
  for (const date of dates) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Get responses for this date
    const responses = await Response.findAll({
      where: {
        questionnaireId,
        responseDate: {
          [Op.gte]: date,
          [Op.lt]: nextDateStr,
        },
      },
      attributes: ['id', 'isComplete'],
    });

    const totalResponses = responses.length;
    const completeResponses = responses.filter(r => r.isComplete).length;

    if (totalResponses === 0) {
      trendData.push({
        date,
        avgRating: null,
        responseRate: null,
        trendValue: null,
      });
      continue;
    }

    // Get answers for this date
    const responseIds = responses.map(r => r.id);
    const answers = await Answer.findAll({
      where: {
        responseId: responseIds,
        isSkipped: false,
        ratingScore: { [Op.not]: null },
      },
      attributes: ['ratingScore'],
    });

    const ratings = answers.map(a => parseFloat(a.ratingScore)).filter(r => !isNaN(r));
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;
    const responseRate = Math.round((completeResponses / totalResponses) * 100);

    // Calculate trend (simplified - compare to previous day)
    let trendValue = null;
    if (trendData.length > 0 && trendData[trendData.length - 1].avgRating !== null && avgRating !== null) {
      const prevRating = trendData[trendData.length - 1].avgRating;
      trendValue = Math.round(((avgRating - prevRating) / prevRating) * 100);
    }

    trendData.push({
      date,
      avgRating: avgRating ? Math.round(avgRating * 100) / 100 : null,
      responseRate,
      trendValue,
    });
  }

  return trendData;
};

/**
 * Calculate breakdown data for a questionnaire and period
 * @param {number} questionnaireId - Questionnaire ID
 * @param {string} periodType - Period type
 * @param {string} periodDate - Period start date
 * @returns {Array} Breakdown data
 */
const calculateBreakdown = async (questionnaireId, periodType, periodDate) => {
  const { startDate, endDate } = getPeriodRange(periodDate, periodType);

  // Get questionnaire with category mapping
  const questionnaire = await Questionnaire.findByPk(questionnaireId, {
    attributes: ['categoryMapping'],
  });

  if (!questionnaire) {
    throw new Error(`Questionnaire ${questionnaireId} not found`);
  }

  // Get answers with question categories and response date filtering
  const answers = await Answer.findAll({
    attributes: ['ratingScore'],
    include: [
      {
        model: Question,
        as: 'question',
        attributes: ['category'],
        where: { questionnaireId },
        required: true,
      },
      {
        model: Response,
        as: 'response',
        attributes: [],
        where: {
          questionnaireId,
          responseDate: {
            [Op.gte]: startDate,
            [Op.lt]: endDate,
          },
        },
        required: true,
      },
    ],
    where: {
      isSkipped: false,
      ratingScore: { [Op.not]: null },
    },
    raw: true,
  });

  if (answers.length === 0) {
    return [];
  }

  // Group by category
  const categoryData = {};
  answers.forEach(answer => {
    const category = answer['question.category'] || 'uncategorized';
    if (!categoryData[category]) {
      categoryData[category] = {
        ratings: [],
        count: 0,
      };
    }
    categoryData[category].ratings.push(parseFloat(answer.ratingScore));
    categoryData[category].count++;
  });

  // Calculate breakdown for each category
  const breakdownData = [];
  for (const [category, data] of Object.entries(categoryData)) {
    const avgRating = data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length;

    // Determine status based on rating
    let status = 'Monitor';
    if (avgRating >= 4.0) status = 'Good';
    else if (avgRating < 3.0) status = 'Urgent';

    // For trend, we'd need previous period data - simplified to null for now
    const trend = null;

    breakdownData.push({
      area: category,
      avgRating: Math.round(avgRating * 100) / 100,
      responses: data.count,
      trend,
      status,
    });
  }

  return breakdownData;
};

/**
 * Refresh analytics data for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Array} periodTypes - Array of period types to refresh
 * @returns {Object} Refresh results
 */
const refreshAnalytics = async (questionnaireId, periodTypes = ['day', 'week', 'month', 'year']) => {
  const { AnalyticsKPI, AnalyticsTrend, AnalyticsBreakdown } = require('../models');
  try {
    logger.info(`Starting analytics refresh for questionnaire ${questionnaireId}`);

    const results = {
      kpis: { created: 0, updated: 0 },
      trends: { created: 0, updated: 0 },
      breakdown: { created: 0, updated: 0 },
    };

    // Get the date range to process (last 30 days for simplicity)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (const periodType of periodTypes) {
      let currentPeriod = getPeriodDate(startDate, periodType);
      const endPeriod = getPeriodDate(endDate, periodType);

      while (currentPeriod <= endPeriod) {
        // Refresh KPIs
        const kpiData = await calculateKPIs(questionnaireId, periodType, currentPeriod);
        const [, kpiCreated] = await AnalyticsKPI.upsert({
          questionnaireId,
          periodType,
          periodDate: currentPeriod,
          ...kpiData,
        });
        results.kpis[kpiCreated ? 'created' : 'updated']++;

        // Refresh Trends
        const trendData = await calculateTrends(questionnaireId, periodType, currentPeriod);
        for (const trend of trendData) {
          const [, trendCreated] = await AnalyticsTrend.upsert({
            questionnaireId,
            periodType,
            periodDate: currentPeriod,
            ...trend,
          });
          results.trends[trendCreated ? 'created' : 'updated']++;
        }

        // Refresh Breakdown
        const breakdownData = await calculateBreakdown(questionnaireId, periodType, currentPeriod);
        for (const breakdown of breakdownData) {
          const [, breakdownCreated] = await AnalyticsBreakdown.upsert({
            questionnaireId,
            periodType,
            periodDate: currentPeriod,
            ...breakdown,
          });
          results.breakdown[breakdownCreated ? 'created' : 'updated']++;
        }

        // Move to next period
        const nextDate = new Date(currentPeriod);
        switch (periodType) {
          case 'day':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'week':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'month':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'year':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }
        currentPeriod = getPeriodDate(nextDate, periodType);
      }
    }

    logger.info(`Analytics refresh completed for questionnaire ${questionnaireId}`, results);
    return results;

  } catch (error) {
    logger.error(`Error refreshing analytics for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Get analytics dashboard data
 * @param {number} questionnaireId - Questionnaire ID
 * @param {string} periodType - Period type (day, week, month, year)
 * @returns {Object} Dashboard data
 */
const getDashboardData = async (questionnaireId, periodType = 'week') => {
  const { AnalyticsKPI, AnalyticsTrend, AnalyticsBreakdown } = require('../models');
  try {
    // Get latest KPI
    const kpi = await AnalyticsKPI.getLatest(questionnaireId, periodType);

    // Get trend data (last 30 days/points)
    const trends = await AnalyticsTrend.findByQuestionnaireAndPeriod(questionnaireId, periodType, {
      limit: 30,
      order: [['date', 'ASC']],
    });

    // Get breakdown data
    const breakdown = await AnalyticsBreakdown.findByQuestionnaireAndPeriod(questionnaireId, periodType, {
      limit: 20,
      order: [['avg_rating', 'DESC']],
    });

    return {
      kpi: kpi ? kpi.toJSON() : null,
      trends: trends.map(t => t.toJSON()),
      breakdown: breakdown.map(b => b.toJSON()),
    };

  } catch (error) {
    logger.error(`Error getting dashboard data for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

module.exports = {
  refreshAnalytics,
  getDashboardData,
  calculateKPIs,
  calculateTrends,
  calculateBreakdown,
  getPeriodDate,
  getPeriodRange,
};