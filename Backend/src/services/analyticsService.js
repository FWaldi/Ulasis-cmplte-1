'use strict';

const { Response, Answer, Questionnaire, Question, QRCode } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Analytics Service
 * Processes and aggregates measurable data from responses
 */

/**
 * Get comprehensive analytics for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Analytics options
 * @returns {Promise<Object>} Analytics data
 */
const getQuestionnaireAnalytics = async (questionnaireId, options = {}) => {
  try {
    const {
      dateFrom = null,
      dateTo = null,
      includeIncomplete = false,
      groupBy = 'day', // day, week, month
    } = options;

    logger.info(`Generating analytics for questionnaire ${questionnaireId}`);

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId },
      attributes: ['id', 'title', 'categoryMapping', 'createdAt'],
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found`);
    }

    // Build date filter
    const dateFilter = {};
    if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
    if (dateTo) dateFilter[Op.lte] = new Date(dateTo);

    // Get basic response statistics
    const basicStats = await getBasicStatistics(questionnaireId, dateFilter, includeIncomplete);

    // Get question-level analytics
    const questionAnalytics = await getQuestionAnalytics(questionnaireId, dateFilter);

    // Get category analytics
    const categoryAnalytics = await getCategoryAnalytics(questionnaireId, questionnaire.categoryMapping, dateFilter);

    // Get time-series data
    const timeSeriesData = await getTimeSeriesData(questionnaireId, dateFilter, groupBy);

    // Get QR code analytics
    const qrCodeAnalytics = await getQRCodeAnalytics(questionnaireId, dateFilter);

    // Calculate KPIs
    const kpis = calculateKPIs(basicStats, questionAnalytics, categoryAnalytics);

    const analytics = {
      questionnaireId,
      questionnaireTitle: questionnaire.title,
      period: {
        dateFrom,
        dateTo,
        groupBy,
      },
      basicStats,
      questionAnalytics,
      categoryAnalytics,
      timeSeriesData,
      qrCodeAnalytics,
      kpis,
      generatedAt: new Date().toISOString(),
    };

    logger.info(`Analytics generated for questionnaire ${questionnaireId}`, {
      totalResponses: basicStats.totalResponses,
      averageRating: kpis.averageRating,
    });

    return analytics;

  } catch (error) {
    logger.error(`Error generating analytics for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Get basic response statistics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter object
 * @param {boolean} includeIncomplete - Include incomplete responses
 * @returns {Promise<Object>} Basic statistics
 */
const getBasicStatistics = async (questionnaireId, dateFilter, includeIncomplete = false) => {
  const whereClause = { questionnaireId };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.responseDate = dateFilter;
  }
  if (!includeIncomplete) {
    whereClause.isComplete = true;
  }

  const [
    totalResponses,
    completeResponses,
    averageCompletionTime,
    averageProgress,
  ] = await Promise.all([
    Response.count({ where: whereClause }),
    Response.count({ where: { ...whereClause, isComplete: true } }),
    Response.average('completion_time', {
      where: { ...whereClause, isComplete: true, completionTime: { [Op.not]: null } },
    }),
    Response.average('progress_percentage', { where: whereClause }),
  ]);

  return {
    totalResponses,
    completeResponses,
    incompleteResponses: totalResponses - completeResponses,
    completionRate: totalResponses > 0 ? Math.round((completeResponses / totalResponses) * 100) : 0,
    averageCompletionTime: Math.round(averageCompletionTime || 0),
    averageProgress: Math.round((averageProgress || 0) * 100) / 100,
  };
};

/**
 * Get question-level analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Array>} Question analytics array
 */
const getQuestionAnalytics = async (questionnaireId, dateFilter) => {
  // Get all questions for the questionnaire
  const questions = await Question.findAll({
    where: { questionnaireId },
    attributes: ['id', 'questionText', 'questionType', 'category', 'isRequired', 'options'],
    order: [['orderIndex', 'ASC']],
  });

  // Process all question statistics in parallel
  const analyticsPromises = questions.map(async (question) => {
    const analytics = await getQuestionStatistics(question.id, dateFilter);
    return {
      questionId: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      category: question.category,
      isRequired: question.isRequired,
      options: question.options,
      ...analytics,
    };
  });

  const questionAnalytics = await Promise.all(analyticsPromises);
  return questionAnalytics;
};

/**
 * Get statistics for a specific question
 * @param {number} questionId - Question ID
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Object>} Question statistics
 */
const getQuestionStatistics = async (questionId, dateFilter) => {
  const whereClause = { questionId };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  const [
    totalAnswers,
    skippedAnswers,
    validAnswers,
    averageRating,
    ratingDistribution,
    choiceDistribution,
  ] = await Promise.all([
    Answer.count({ where: { questionId } }),
    Answer.count({ where: { questionId, isSkipped: true } }),
    Answer.count({ where: { ...whereClause, isSkipped: false, validationStatus: 'valid' } }),
    Answer.average('rating_score', {
      where: { ...whereClause, isSkipped: false, ratingScore: { [Op.not]: null } },
    }),
    getRatingDistribution(questionId, dateFilter),
    getChoiceDistribution(questionId, dateFilter),
  ]);

  return {
    totalAnswers,
    skippedAnswers,
    validAnswers,
    invalidAnswers: totalAnswers - validAnswers,
    skipRate: totalAnswers > 0 ? Math.round((skippedAnswers / totalAnswers) * 100) : 0,
    validRate: totalAnswers > 0 ? Math.round((validAnswers / totalAnswers) * 100) : 0,
    averageRating: averageRating ? Math.round(averageRating * 100) / 100 : 0,
    ratingDistribution,
    choiceDistribution,
  };
};

/**
 * Get rating distribution for a question
 * @param {number} questionId - Question ID
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Object>} Rating distribution
 */
const getRatingDistribution = async (questionId, dateFilter) => {
  const whereClause = {
    questionId,
    isSkipped: false,
    ratingScore: { [Op.not]: null },
  };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  const ratings = await Answer.findAll({
    attributes: [
      'ratingScore',
      [Answer.sequelize.fn('COUNT', Answer.sequelize.col('id')), 'count'],
    ],
    where: whereClause,
    group: ['ratingScore'],
    order: [['ratingScore', 'ASC']],
    raw: true,
  });

  const distribution = {};
  ratings.forEach(rating => {
    const score = Math.round(parseFloat(rating.ratingScore));
    distribution[score] = parseInt(rating.count);
  });

  return distribution;
};

/**
 * Get choice distribution for multiple choice questions
 * @param {number} questionId - Question ID
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Object>} Choice distribution
 */
const getChoiceDistribution = async (questionId, dateFilter) => {
  const whereClause = {
    questionId,
    isSkipped: false,
    selectedOptions: { [Op.not]: null },
  };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  const answers = await Answer.findAll({
    attributes: ['selectedOptions'],
    where: whereClause,
    raw: true,
  });

  const distribution = {};
  answers.forEach(answer => {
    if (Array.isArray(answer.selectedOptions)) {
      answer.selectedOptions.forEach(option => {
        distribution[option] = (distribution[option] || 0) + 1;
      });
    }
  });

  return distribution;
};

/**
 * Get category-level analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping from questionnaire
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Object>} Category analytics
 */
const getCategoryAnalytics = async (questionnaireId, categoryMapping, dateFilter) => {
  // Get all answers with their questions
  const answers = await Answer.findAll({
    attributes: ['ratingScore', 'isSkipped'],
    include: [
      {
        model: Question,
        as: 'question',
        attributes: ['category'],
        where: { questionnaireId },
      },
    ],
    where: Object.keys(dateFilter).length > 0 ? {
      createdAt: dateFilter,
    } : {},
    raw: false,
  });

  const categoryStats = {};

  answers.forEach(answer => {
    const category = answer.question?.category || 'uncategorized';

    if (!categoryStats[category]) {
      categoryStats[category] = {
        totalAnswers: 0,
        skippedAnswers: 0,
        validRatings: 0,
        totalRating: 0,
        averageRating: 0,
      };
    }

    categoryStats[category].totalAnswers++;

    if (answer.isSkipped) {
      categoryStats[category].skippedAnswers++;
    } else if (answer.ratingScore && answer.ratingScore > 0) {
      categoryStats[category].validRatings++;
      categoryStats[category].totalRating += parseFloat(answer.ratingScore);
    }
  });

  // Calculate averages and apply category weights
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    stats.averageRating = stats.validRatings > 0 ? stats.totalRating / stats.validRatings : 0;
    stats.skipRate = stats.totalAnswers > 0 ? Math.round((stats.skippedAnswers / stats.totalAnswers) * 100) : 0;

    // Apply category weight if defined in mapping
    if (categoryMapping && categoryMapping[category] && categoryMapping[category].weight) {
      stats.weightedAverageRating = stats.averageRating * categoryMapping[category].weight;
    } else {
      stats.weightedAverageRating = stats.averageRating;
    }

    // Round values
    stats.averageRating = Math.round(stats.averageRating * 100) / 100;
    stats.weightedAverageRating = Math.round(stats.weightedAverageRating * 100) / 100;
  });

  return categoryStats;
};

/**
 * Get time-series data for responses
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter object
 * @param {string} groupBy - Grouping period (day, week, month)
 * @returns {Promise<Array>} Time-series data
 */
const getTimeSeriesData = async (questionnaireId, dateFilter, groupBy = 'day') => {
  let dateFormat;
  switch (groupBy) {
    case 'week':
      dateFormat = '%Y-%u';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default: // day
      dateFormat = '%Y-%m-%d';
  }

  const whereClause = { questionnaireId };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.responseDate = dateFilter;
  }

  const timeSeries = await Response.findAll({
    attributes: [
      [Response.sequelize.fn('DATE_FORMAT', Response.sequelize.col('response_date'), dateFormat), 'period'],
      [Response.sequelize.fn('COUNT', Response.sequelize.col('id')), 'responses'],
      [Response.sequelize.fn('AVG', Response.sequelize.col('progress_percentage')), 'avgProgress'],
    ],
    where: whereClause,
    group: [Response.sequelize.fn('DATE_FORMAT', Response.sequelize.col('response_date'), dateFormat)],
    order: [[Response.sequelize.fn('DATE_FORMAT', Response.sequelize.col('response_date'), dateFormat), 'ASC']],
    raw: true,
  });

  return timeSeries.map(item => ({
    period: item.period,
    responses: parseInt(item.responses),
    averageProgress: Math.round((parseFloat(item.avgProgress) || 0) * 100) / 100,
  }));
};

/**
 * Get QR code analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} dateFilter - Date filter object
 * @returns {Promise<Array>} QR code analytics
 */
const getQRCodeAnalytics = async (questionnaireId, dateFilter) => {
  const qrCodes = await QRCode.findAll({
    where: { questionnaireId },
    attributes: ['id', 'locationTag', 'createdAt'],
    include: [
      {
        model: Response,
        as: 'responses',
        attributes: ['id'],
        where: Object.keys(dateFilter).length > 0 ? {
          responseDate: dateFilter,
        } : {},
        required: false,
      },
    ],
  });

  return qrCodes.map(qrCode => ({
    qrCodeId: qrCode.id,
    locationTag: qrCode.locationTag,
    scanCount: qrCode.responses ? qrCode.responses.length : 0,
    createdAt: qrCode.createdAt,
  }));
};

/**
 * Calculate KPIs from analytics data
 * @param {Object} basicStats - Basic statistics
 * @param {Array} questionAnalytics - Question analytics
 * @param {Object} categoryAnalytics - Category analytics
 * @returns {Object} KPIs
 */
const calculateKPIs = (basicStats, questionAnalytics, categoryAnalytics) => {
  // Calculate overall average rating
  let totalRating = 0;
  let ratingCount = 0;

  questionAnalytics.forEach(question => {
    if (question.averageRating > 0) {
      totalRating += question.averageRating;
      ratingCount++;
    }
  });

  const overallAverageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

  // Calculate response quality score
  const avgCompletionRate = basicStats.completionRate;
  const avgValidRate = questionAnalytics.reduce((sum, q) => sum + q.validRate, 0) / questionAnalytics.length;
  const qualityScore = (avgCompletionRate + avgValidRate) / 2;

  // Calculate engagement score
  const engagementScore = Math.min(100, (basicStats.totalResponses / 10) * 100); // Normalize to 10 responses = 100%

  // Find best and worst performing categories
  const categoryScores = Object.entries(categoryAnalytics).map(([category, stats]) => ({
    category,
    score: stats.weightedAverageRating,
  }));

  categoryScores.sort((a, b) => b.score - a.score);

  return {
    averageRating: Math.round(overallAverageRating * 100) / 100,
    responseQualityScore: Math.round(qualityScore * 100) / 100,
    engagementScore: Math.round(engagementScore),
    totalResponses: basicStats.totalResponses,
    completionRate: basicStats.completionRate,
    bestCategory: categoryScores[0]?.category || 'none',
    worstCategory: categoryScores[categoryScores.length - 1]?.category || 'none',
    categoryCount: Object.keys(categoryAnalytics).length,
  };
};

/**
 * Get real-time KPI updates for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @returns {Promise<Object>} Real-time KPIs
 */
const getRealTimeKPIs = async (questionnaireId) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalResponses,
      todayResponses,
      weekResponses,
      recentAverageRating,
    ] = await Promise.all([
      Response.count({ where: { questionnaireId } }),
      Response.count({
        where: {
          questionnaireId,
          responseDate: { [Op.gte]: oneDayAgo },
        },
      }),
      Response.count({
        where: {
          questionnaireId,
          responseDate: { [Op.gte]: oneWeekAgo },
        },
      }),
      Answer.average('rating_score', {
        include: [
          {
            model: Response,
            as: 'response',
            where: {
              questionnaireId,
              responseDate: { [Op.gte]: oneWeekAgo },
            },
          },
        ],
        where: {
          ratingScore: { [Op.not]: null },
        },
      }),
    ]);

    return {
      questionnaireId,
      totalResponses,
      todayResponses,
      weekResponses,
      recentAverageRating: recentAverageRating ? Math.round(recentAverageRating * 100) / 100 : 0,
      responseRateToday: todayResponses,
      responseRateWeek: Math.round(weekResponses / 7 * 100) / 100, // Average per day this week
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    logger.error(`Error getting real-time KPIs for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

module.exports = {
  getQuestionnaireAnalytics,
  getQuestionStatistics,
  getBasicStatistics,
  getCategoryAnalytics,
  getTimeSeriesData,
  getQRCodeAnalytics,
  calculateKPIs,
  getRealTimeKPIs,
};