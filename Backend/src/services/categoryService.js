'use strict';

const { Questionnaire, Question, Answer, Response } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Category Service
 * Manages user-defined category system for question-to-category mapping and analytics
 */

/**
 * Create or update category mapping for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} categoryMapping - Category mapping object
 * @returns {Promise<Object>} Updated category mapping
 */
const updateCategoryMapping = async (questionnaireId, categoryMapping) => {
  try {
    logger.info(`Updating category mapping for questionnaire ${questionnaireId}`);

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found`);
    }

    // Validate category mapping structure
    const validatedMapping = validateCategoryMapping(categoryMapping);

    // Update questionnaire with new category mapping
    await questionnaire.update({
      categoryMapping: validatedMapping,
    });

    logger.info(`Category mapping updated for questionnaire ${questionnaireId}`);
    return validatedMapping;

  } catch (error) {
    logger.error(`Error updating category mapping for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Validate category mapping structure
 * @param {Object} categoryMapping - Category mapping to validate
 * @returns {Object} Validated and cleaned category mapping
 */
const validateCategoryMapping = (categoryMapping) => {
  if (!categoryMapping || typeof categoryMapping !== 'object') {
    return {};
  }

  const validatedMapping = {};

  // Validate question-level mappings
  if (categoryMapping.questions && typeof categoryMapping.questions === 'object') {
    validatedMapping.questions = {};

    for (const [questionId, mapping] of Object.entries(categoryMapping.questions)) {
      if (!isNaN(parseInt(questionId))) {
        validatedMapping.questions[parseInt(questionId)] = validateQuestionMapping(mapping);
      }
    }
  }

  // Validate category-level settings
  if (categoryMapping.categories && typeof categoryMapping.categories === 'object') {
    validatedMapping.categories = {};

    for (const [categoryName, settings] of Object.entries(categoryMapping.categories)) {
      if (typeof categoryName === 'string' && categoryName.trim()) {
        validatedMapping.categories[categoryName.trim()] = validateCategorySettings(settings);
      }
    }
  }

  // Validate global settings
  if (categoryMapping.settings && typeof categoryMapping.settings === 'object') {
    validatedMapping.settings = validateGlobalSettings(categoryMapping.settings);
  }

  return validatedMapping;
};

/**
 * Validate question-level mapping
 * @param {Object} mapping - Question mapping object
 * @returns {Object} Validated question mapping
 */
const validateQuestionMapping = (mapping) => {
  const validatedMapping = {
    category: 'uncategorized',
    weight: 1.0,
    options: {},
  };

  if (mapping && typeof mapping === 'object') {
    // Validate category
    if (mapping.category && typeof mapping.category === 'string') {
      validatedMapping.category = mapping.category.trim();
    }

    // Validate weight
    if (mapping.weight && !isNaN(parseFloat(mapping.weight))) {
      validatedMapping.weight = Math.max(0.1, Math.min(5.0, parseFloat(mapping.weight)));
    }

    // Validate option mappings
    if (mapping.options && typeof mapping.options === 'object') {
      validatedMapping.options = {};

      for (const [option, score] of Object.entries(mapping.options)) {
        if (typeof option === 'string' && !isNaN(parseFloat(score))) {
          validatedMapping.options[option] = Math.max(0, Math.min(10, parseFloat(score)));
        }
      }
    }
  }

  return validatedMapping;
};

/**
 * Validate category settings
 * @param {Object} settings - Category settings object
 * @returns {Object} Validated category settings
 */
const validateCategorySettings = (settings) => {
  const validatedSettings = {
    weight: 1.0,
    color: '#3498db',
    description: '',
    targetScore: 3.0,
  };

  if (settings && typeof settings === 'object') {
    // Validate weight
    if (settings.weight && !isNaN(parseFloat(settings.weight))) {
      validatedSettings.weight = Math.max(0.1, Math.min(5.0, parseFloat(settings.weight)));
    }

    // Validate color (hex color)
    if (settings.color && typeof settings.color === 'string') {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (hexColorRegex.test(settings.color)) {
        validatedSettings.color = settings.color;
      }
    }

    // Validate description
    if (settings.description && typeof settings.description === 'string') {
      validatedSettings.description = settings.description.trim().substring(0, 500);
    }

    // Validate target score
    if (settings.targetScore && !isNaN(parseFloat(settings.targetScore))) {
      validatedSettings.targetScore = Math.max(0, Math.min(10, parseFloat(settings.targetScore)));
    }
  }

  return validatedSettings;
};

/**
 * Validate global settings
 * @param {Object} settings - Global settings object
 * @returns {Object} Validated global settings
 */
const validateGlobalSettings = (settings) => {
  const validatedSettings = {
    enableCategoryWeights: true,
    defaultCategory: 'uncategorized',
    aggregationMethod: 'weighted_average', // weighted_average, simple_average, median
  };

  if (settings && typeof settings === 'object') {
    // Validate boolean settings
    if (typeof settings.enableCategoryWeights === 'boolean') {
      validatedSettings.enableCategoryWeights = settings.enableCategoryWeights;
    }

    // Validate default category
    if (settings.defaultCategory && typeof settings.defaultCategory === 'string') {
      validatedSettings.defaultCategory = settings.defaultCategory.trim();
    }

    // Validate aggregation method
    if (settings.aggregationMethod && typeof settings.aggregationMethod === 'string') {
      const validMethods = ['weighted_average', 'simple_average', 'median'];
      if (validMethods.includes(settings.aggregationMethod)) {
        validatedSettings.aggregationMethod = settings.aggregationMethod;
      }
    }
  }

  return validatedSettings;
};

/**
 * Get category mapping for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @returns {Promise<Object>} Category mapping
 */
const getCategoryMapping = async (questionnaireId) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId },
      attributes: ['categoryMapping'],
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found`);
    }

    return questionnaire.categoryMapping || {};
  } catch (error) {
    logger.error(`Error getting category mapping for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Map questions to categories based on questionnaire mapping
 * @param {number} questionnaireId - Questionnaire ID
 * @returns {Promise<Object>} Question-to-category mapping
 */
const getQuestionCategoryMapping = async (questionnaireId) => {
  try {
    const categoryMapping = await getCategoryMapping(questionnaireId);
    const questionMapping = {};

    // Get all questions for the questionnaire
    const questions = await Question.findAll({
      where: { questionnaireId },
      attributes: ['id', 'category', 'questionType', 'options'],
    });

    questions.forEach(question => {
      const questionId = question.id;

      // Check if there's a custom mapping for this question
      if (categoryMapping.questions && categoryMapping.questions[questionId]) {
        const customMapping = categoryMapping.questions[questionId];
        questionMapping[questionId] = {
          category: customMapping.category || question.category || 'uncategorized',
          weight: customMapping.weight || 1.0,
          options: customMapping.options || {},
        };
      } else {
        // Use default question category
        questionMapping[questionId] = {
          category: question.category || 'uncategorized',
          weight: 1.0,
          options: {},
        };
      }
    });

    return questionMapping;
  } catch (error) {
    logger.error(`Error getting question category mapping for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Process responses with category mapping
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Array<number>} responseIds - Response IDs to process
 * @returns {Promise<Object>} Processing results with category data
 */
const processResponsesWithCategories = async (questionnaireId, responseIds) => {
  try {
    logger.info(`Processing ${responseIds.length} responses with categories for questionnaire ${questionnaireId}`);

    const categoryMapping = await getCategoryMapping(questionnaireId);
    const questionMapping = await getQuestionCategoryMapping(questionnaireId);

    const results = {
      totalResponses: responseIds.length,
      processedResponses: 0,
      categoryResults: {},
      errors: [],
    };

    // Get all answers for the responses
    const answers = await Answer.findAll({
      where: { responseId: { [Op.in]: responseIds } },
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'questionType', 'category', 'options'],
        },
      ],
    });

    // Group answers by response
    const answersByResponse = {};
    answers.forEach(answer => {
      if (!answersByResponse[answer.responseId]) {
        answersByResponse[answer.responseId] = [];
      }
      answersByResponse[answer.responseId].push(answer);
    });

    // Process each response (sequential due to shared results object)
    // eslint-disable-next-line no-await-in-loop
    for (const responseId of responseIds) {
      try {
        const responseAnswers = answersByResponse[responseId] || [];
        const categoryResult = await processResponseCategories(responseId, responseAnswers, questionMapping, categoryMapping);

        // Aggregate category results
        for (const [category, data] of Object.entries(categoryResult.categories)) {
          if (!results.categoryResults[category]) {
            results.categoryResults[category] = {
              totalScore: 0,
              count: 0,
              responses: [],
            };
          }

          results.categoryResults[category].totalScore += data.averageScore;
          results.categoryResults[category].count++;
          results.categoryResults[category].responses.push({
            responseId,
            score: data.averageScore,
          });
        }

        results.processedResponses++;
      } catch (error) {
        results.errors.push({
          responseId,
          error: error.message,
        });
        logger.error(`Error processing response ${responseId} with categories:`, error);
      }
    }

    // Calculate category averages
    for (const [, data] of Object.entries(results.categoryResults)) {
      data.averageScore = data.count > 0 ? data.totalScore / data.count : 0;
      data.averageScore = Math.round(data.averageScore * 100) / 100;
    }

    logger.info(`Category processing completed for questionnaire ${questionnaireId}`, {
      processedResponses: results.processedResponses,
      totalResponses: results.totalResponses,
      categories: Object.keys(results.categoryResults).length,
    });

    return results;
  } catch (error) {
    logger.error(`Error processing responses with categories for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Process individual response with categories
 * @param {number} responseId - Response ID
 * @param {Array} answers - Answer objects
 * @param {Object} questionMapping - Question-to-category mapping
 * @param {Object} categoryMapping - Category mapping settings
 * @returns {Promise<Object>} Category processing result for response
 */
const processResponseCategories = (responseId, answers, questionMapping, categoryMapping) => {
  const categories = {};
  let totalScore = 0;
  let totalWeight = 0;

  for (const answer of answers) {
    const questionId = answer.questionId;
    const mapping = questionMapping[questionId];

    if (!mapping) continue;

    const category = mapping.category;
    const weight = mapping.weight;

    // Get answer score
    let answerScore = 0;

    if (answer.ratingScore && answer.ratingScore > 0) {
      answerScore = parseFloat(answer.ratingScore);
    } else if (mapping.options && answer.selectedOptions) {
      // Calculate score from selected options
      let optionScore = 0;
      let optionCount = 0;

      answer.selectedOptions.forEach(option => {
        if (mapping.options[option] !== undefined) {
          optionScore += mapping.options[option];
          optionCount++;
        }
      });

      answerScore = optionCount > 0 ? optionScore / optionCount : 0;
    }

    if (answerScore > 0) {
      if (!categories[category]) {
        categories[category] = {
          totalScore: 0,
          totalWeight: 0,
          answers: [],
        };
      }

      categories[category].totalScore += answerScore * weight;
      categories[category].totalWeight += weight;
      categories[category].answers.push({
        questionId,
        answerId: answer.id,
        score: answerScore,
        weight,
      });

      totalScore += answerScore * weight;
      totalWeight += weight;
    }
  }

  // Calculate average scores for each category
  const categoryResults = {};
  for (const [category, data] of Object.entries(categories)) {
    categoryResults[category] = {
      averageScore: data.totalWeight > 0 ? data.totalScore / data.totalWeight : 0,
      totalWeight: data.totalWeight,
      answerCount: data.answers.length,
    };

    // Apply category weight if defined
    if (categoryMapping.categories && categoryMapping.categories[category]) {
      const categorySettings = categoryMapping.categories[category];
      if (categorySettings.weight) {
        categoryResults[category].weightedScore = categoryResults[category].averageScore * categorySettings.weight;
      }
    }
  }

  return {
    responseId,
    overallScore: totalWeight > 0 ? totalScore / totalWeight : 0,
    categories: categoryResults,
  };
};

/**
 * Get category performance analytics
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Analytics options
 * @returns {Promise<Object>} Category performance data
 */
const getCategoryPerformance = async (questionnaireId, options = {}) => {
  try {
    const { dateFrom = null, dateTo = null } = options;

    const categoryMapping = await getCategoryMapping(questionnaireId);
    const _questionMapping = await getQuestionCategoryMapping(questionnaireId); // eslint-disable-line no-unused-vars

    // Get all responses in date range
    const whereClause = { questionnaireId };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) whereClause.responseDate[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.responseDate[Op.lte] = new Date(dateTo);
    }

    const responses = await Response.findAll({
      where: whereClause,
      attributes: ['id'],
      include: [
        {
          model: Answer,
          as: 'answers',
          attributes: ['id', 'questionId', 'ratingScore', 'selectedOptions'],
          include: [
            {
              model: Question,
              as: 'question',
              attributes: ['id', 'questionType', 'category', 'options'],
            },
          ],
        },
      ],
    });

    const responseIds = responses.map(r => r.id);
    const processingResults = await processResponsesWithCategories(questionnaireId, responseIds);

    // Generate performance insights
    const performance = {
      questionnaireId,
      period: { dateFrom, dateTo },
      totalResponses: processingResults.totalResponses,
      processedResponses: processingResults.processedResponses,
      categories: {},
      insights: [],
    };

    for (const [category, data] of Object.entries(processingResults.categoryResults)) {
      const categorySettings = categoryMapping.categories?.[category] || {};
      const targetScore = categorySettings.targetScore || 3.0;

      performance.categories[category] = {
        ...data,
        targetScore,
        performance: data.averageScore >= targetScore ? 'above_target' : 'below_target',
        gap: Math.round((data.averageScore - targetScore) * 100) / 100,
        responseRate: Math.round((data.responses.length / processingResults.processedResponses) * 100),
      };

      // Generate insights
      if (data.averageScore < targetScore) {
        performance.insights.push({
          type: 'improvement_needed',
          category,
          message: `${category} category is ${Math.abs(performance.categories[category].gap)} points below target`,
          priority: performance.categories[category].gap < -1 ? 'high' : 'medium',
        });
      } else if (data.averageScore > targetScore + 1) {
        performance.insights.push({
          type: 'excellent_performance',
          category,
          message: `${category} category is performing ${Math.round(performance.categories[category].gap)} points above target`,
          priority: 'low',
        });
      }
    }

    return performance;
  } catch (error) {
    logger.error(`Error getting category performance for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

module.exports = {
  updateCategoryMapping,
  getCategoryMapping,
  getQuestionCategoryMapping,
  processResponsesWithCategories,
  getCategoryPerformance,
  validateCategoryMapping,
  validateQuestionMapping,
  validateCategorySettings,
  validateGlobalSettings,
};