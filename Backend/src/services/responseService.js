'use strict';

const { Response, Answer, Questionnaire, Question, User, NotificationPreference } = require('../models');
const logger = require('../utils/logger');

const batchProcessingService = require('./batchProcessingService');
const emailService = require('./emailService');

/**
 * Response Processing Service
 * Handles processing of anonymous responses to extract measurable data
 */

/**
 * Process a newly submitted response
 * @param {number} responseId - ID of the response to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
const processResponse = async (responseInput, options = {}) => {
  // Handle both response ID and full response object
  const responseId = typeof responseInput === 'object' ? responseInput.id : responseInput;

  try {

    // Check if batch processing is enabled and this is not a forced immediate processing
    if (process.env.BATCH_PROCESSING_ENABLED === 'true' && !options.immediate) {
      const queueResult = await batchProcessingService.addToQueue(responseId, options);
      logger.info(`Response ${responseId} added to batch queue:`, queueResult);
      return {
        responseId,
        success: true,
        queued: true,
        queuePosition: queueResult.queuePosition,
        estimatedWaitTime: queueResult.estimatedWaitTime,
        message: 'Response added to batch processing queue',
      };
    }

    logger.info(`Processing response: ${responseId}`);

    // Use provided response object or fetch from database
    let response;
    if (typeof responseInput === 'object' && responseInput.answers) {
      // Response object already includes answers
      response = responseInput;
    } else {
      // Need to fetch response with answers
      response = await Response.findOne({
        where: { id: responseId },
        include: [
          {
            model: Answer,
            as: 'answers',
            include: [
              {
                model: Question,
                as: 'question',
                attributes: ['id', 'questionText', 'questionType', 'category', 'isRequired', 'options'],
              },
            ],
          },
          {
            model: Questionnaire,
            as: 'questionnaire',
            attributes: ['id', 'title', 'categoryMapping'],
          },
        ],
      });
    }

    if (!response) {
      throw new Error(`Response ${responseId} not found`);
    }

    // Process each answer
    const processedAnswers = [];
    let totalRatingScore = 0;
    let ratingCount = 0;
    const categoryScores = {};

    // Process answers sequentially due to shared aggregation variables
    // eslint-disable-next-line no-await-in-loop
    for (const answer of response.answers) {
      const processedAnswer = await processAnswer(answer, response.questionnaire);
      processedAnswers.push(processedAnswer);

      // Aggregate rating scores
      if (processedAnswer.ratingScore && processedAnswer.ratingScore > 0) {
        totalRatingScore += processedAnswer.ratingScore;
        ratingCount++;
      }

      // Aggregate by category
      const category = answer.question?.category || 'uncategorized';
      if (!categoryScores[category]) {
        categoryScores[category] = {
          totalScore: 0,
          count: 0,
          responses: [],
        };
      }

      if (processedAnswer.ratingScore && processedAnswer.ratingScore > 0) {
        categoryScores[category].totalScore += processedAnswer.ratingScore;
        categoryScores[category].count++;
      }

      categoryScores[category].responses.push({
        answerId: answer.id,
        score: processedAnswer.ratingScore,
        sentiment: processedAnswer.sentiment,
      });
    }

    // Calculate overall metrics
    const averageRating = ratingCount > 0 ? totalRatingScore / ratingCount : 0;
    const categoryAverages = {};

    for (const [category, data] of Object.entries(categoryScores)) {
      categoryAverages[category] = data.count > 0 ? data.totalScore / data.count : 0;
    }

    // Update response with processed data
    await response.update({
      metadata: {
        processed: true,
        processedAt: new Date().toISOString(),
        averageRating,
        categoryAverages,
        totalAnswers: processedAnswers.length,
        ratingCount,
      },
    });

    // Update individual answers in parallel
    const updatePromises = processedAnswers.map((processedAnswer, _i) => // eslint-disable-line no-unused-vars
      Answer.update(
        {
          ratingScore: processedAnswer.ratingScore,
          metadata: {
            ...processedAnswer.metadata,
            processed: true,
            processedAt: new Date().toISOString(),
          },
        },
        { where: { id: processedAnswer.answerId } },
      ),
    );

    await Promise.all(updatePromises);

    const processingResult = {
      responseId,
      success: true,
      metrics: {
        totalAnswers: processedAnswers.length,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingCount,
        categoryAverages: Object.fromEntries(
          Object.entries(categoryAverages).map(([cat, avg]) => [cat, Math.round(avg * 100) / 100]),
        ),
      },
      processedAt: new Date().toISOString(),
    };

    // Send new review notification email if applicable
    if (averageRating > 0) {
      try {
        await sendNewReviewNotificationEmail(response, averageRating, processedAnswers);
      } catch (emailError) {
        logger.error(`Failed to send new review notification for response ${responseId}:`, emailError);
        // Don't fail the response processing if email fails
      }
    }

    logger.info(`Response processing completed: ${responseId}`, processingResult.metrics);
    return processingResult;

  } catch (error) {
    logger.error(`Error processing response ${responseId}:`, error);

    // Mark response as processing failed
    try {
      await Response.update(
        {
          metadata: {
            processed: false,
            processingError: error.message,
            processedAt: new Date().toISOString(),
          },
        },
        { where: { id: responseId } },
      );
    } catch (updateError) {
      logger.error(`Error updating response ${responseId} with processing error:`, updateError);
    }

    throw error;
  }
};

/**
 * Process individual answer to extract measurable data
 * @param {Object} answer - Answer object with question
 * @param {Object} questionnaire - Questionnaire object
 * @returns {Promise<Object>} Processed answer data
 */
const processAnswer = (answer, questionnaire) => {
  const question = answer.question;
  const processedAnswer = {
    answerId: answer.id,
    questionId: question.id,
    questionType: question.questionType,
    category: question.category || 'uncategorized',
    originalValue: answer.answerValue,
    ratingScore: answer.ratingScore,
    sentiment: null,
    metadata: answer.metadata || {},
  };

  try {
    switch (question.questionType) {
      case 'rating':
      case 'scale':
        // Rating questions already have numeric scores
        if (answer.ratingScore) {
          processedAnswer.ratingScore = parseFloat(answer.ratingScore);
        }
        break;

      case 'yes_no':
        // Convert yes/no to numeric score (yes=5, no=1)
        if (answer.answerValue) {
          const yesNoValue = answer.answerValue.toString().toLowerCase();
          if (yesNoValue === 'yes') {
            processedAnswer.ratingScore = 5;
          } else if (yesNoValue === 'no') {
            processedAnswer.ratingScore = 1;
          }
        }
        break;

      case 'single_choice':
      case 'multiple_choice':
        // Map choice options to scores based on questionnaire category mapping
        if (question.options && answer.selectedOptions) {
          const categoryMapping = questionnaire?.categoryMapping || {};
          const questionMapping = categoryMapping[question.id] || {};

          let totalScore = 0;
          let optionCount = 0;

          for (const option of answer.selectedOptions) {
            const optionScore = questionMapping[option] || getDefaultChoiceScore(option, question.options);
            totalScore += optionScore;
            optionCount++;
          }

          processedAnswer.ratingScore = optionCount > 0 ? totalScore / optionCount : 0;
        }
        break;

      case 'text':
      case 'textarea':
        // Extract sentiment and rating from text responses
        if (answer.answerValue && answer.answerValue.trim()) {
          const textAnalysis = analyzeTextResponse(answer.answerValue);
          processedAnswer.sentiment = textAnalysis.sentiment;
          processedAnswer.ratingScore = textAnalysis.ratingScore;
          processedAnswer.metadata.textAnalysis = textAnalysis;
        }
        break;

      case 'number':
        // Convert numeric answers to rating scores
        if (answer.answerValue) {
          const num = parseFloat(answer.answerValue);
          if (!isNaN(num)) {
            // Normalize to 1-5 scale based on question min/max values
            const min = question.minValue || 0;
            const max = question.maxValue || 10;
            processedAnswer.ratingScore = normalizeToScale(num, min, max, 1, 5);
          }
        }
        break;

      default:
        // For other question types, use existing rating score if available
        if (answer.ratingScore) {
          processedAnswer.ratingScore = parseFloat(answer.ratingScore);
        }
        break;
    }

    // Apply category-based adjustments if defined
    if (questionnaire?.categoryMapping && processedAnswer.category) {
      const categoryAdjustments = questionnaire.categoryMapping[processedAnswer.category];
      if (categoryAdjustments && categoryAdjustments.weight) {
        processedAnswer.ratingScore *= categoryAdjustments.weight;
      }
    }

    // Ensure rating score is within valid range
    if (processedAnswer.ratingScore) {
      processedAnswer.ratingScore = Math.max(0, Math.min(10, processedAnswer.ratingScore));
    }

  } catch (error) {
    logger.error(`Error processing answer ${answer.id}:`, error);
    processedAnswer.metadata.processingError = error.message;
  }

  return processedAnswer;
};

/**
 * Analyze text response for sentiment and rating
 * @param {string} text - Text to analyze
 * @returns {Object} Text analysis results
 */
const analyzeTextResponse = (text) => {
  // Simple sentiment analysis (in production, use a proper NLP service)
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointing', 'poor', 'unacceptable'];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  const totalSentimentWords = positiveCount + negativeCount;
  let sentiment = 'neutral';
  let ratingScore = 3; // Default neutral rating

  if (totalSentimentWords > 0) {
    const positiveRatio = positiveCount / totalSentimentWords;

    if (positiveRatio >= 0.7) {
      sentiment = 'positive';
      ratingScore = 4.5;
    } else if (positiveRatio >= 0.4) {
      sentiment = 'slightly_positive';
      ratingScore = 3.5;
    } else if (positiveRatio <= 0.3) {
      sentiment = 'negative';
      ratingScore = 1.5;
    } else {
      sentiment = 'slightly_negative';
      ratingScore = 2.5;
    }
  }

  // Check for exclamation marks and all caps as additional indicators
  const exclamationCount = (text.match(/!/g) || []).length;
  const allCapsRatio = (text.match(/[A-Z]/g) || []).length / text.length;

  if (exclamationCount > 2) {
    if (sentiment === 'positive') {
      ratingScore = Math.min(5, ratingScore + 0.5);
    } else if (sentiment === 'negative') {
      ratingScore = Math.max(1, ratingScore - 0.5);
    }
  }

  if (allCapsRatio > 0.5 && text.length > 10) {
    // All caps might indicate strong emotion
    if (sentiment === 'positive') {
      ratingScore = Math.min(5, ratingScore + 0.3);
    } else if (sentiment === 'negative') {
      ratingScore = Math.max(1, ratingScore - 0.3);
    }
  }

  return {
    sentiment,
    ratingScore: Math.round(ratingScore * 100) / 100,
    positiveWords: positiveCount,
    negativeWords: negativeCount,
    wordCount: words.length,
    exclamationCount,
    allCapsRatio: Math.round(allCapsRatio * 100) / 100,
  };
};

/**
 * Get default score for choice options
 * @param {string} option - Choice option value
 * @param {Array} allOptions - All available options
 * @returns {number} Default score (1-5 scale)
 */
const getDefaultChoiceScore = (option, allOptions) => {
  if (!Array.isArray(allOptions) || allOptions.length === 0) {
    return 3; // Default neutral score
  }

  const optionIndex = allOptions.indexOf(option);
  if (optionIndex === -1) {
    return 3; // Default neutral score for unknown options
  }

  // Map position to 1-5 scale
  const scale = 5;
  const score = Math.round(((optionIndex + 1) / allOptions.length) * scale);
  return Math.max(1, Math.min(5, score));
};

/**
 * Normalize a number from one scale to another
 * @param {number} value - Value to normalize
 * @param {number} fromMin - Source scale minimum
 * @param {number} fromMax - Source scale maximum
 * @param {number} toMin - Target scale minimum
 * @param {number} toMax - Target scale maximum
 * @returns {number} Normalized value
 */
const normalizeToScale = (value, fromMin, fromMax, toMin, toMax) => {
  if (fromMax === fromMin) return toMin;

  const normalized = ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
  return Math.max(toMin, Math.min(toMax, normalized));
};


/**
 * Get batch processing status
 * @returns {Object} Batch processing status
 */
const getBatchProcessingStatus = () => {
  return batchProcessingService.getStatus();
};

/**
 * Configure batch processing
 * @param {Object} config - Configuration options
 * @returns {Object} Configuration result
 */
const configureBatchProcessing = (config) => {
  try {
    batchProcessingService.configure(config);
    logger.info('Batch processing configured:', config);
    return { success: true, message: 'Batch processing configured successfully' };
  } catch (error) {
    logger.error('Error configuring batch processing:', error);
    throw error;
  }
};

/**
 * Force process all queued responses
 * @returns {Promise<Object>} Processing results
 */
const forceProcessAllQueued = async () => {
  try {
    const results = await batchProcessingService.forceProcessAll();
    logger.info('Force processed all queued responses:', results);
    return results;
  } catch (error) {
    logger.error('Error force processing queued responses:', error);
    throw error;
  }
};


/**
 * Send new review notification email to questionnaire owner
 * @param {Object} response - Response object with questionnaire
 * @param {number} averageRating - Average rating from the response
 * @param {Array} processedAnswers - Processed answers
 */
const sendNewReviewNotificationEmail = async (response, averageRating, processedAnswers) => {
  try {
    const questionnaire = response.questionnaire;
    if (!questionnaire) {
      logger.warn(`No questionnaire found for response ${response.id}, skipping review email`);
      return;
    }

    // Get questionnaire owner
    const owner = await User.findByPk(questionnaire.userId);
    if (!owner) {
      logger.warn(`No owner found for questionnaire ${questionnaire.id}, skipping review email`);
      return;
    }

    // Check if owner has enabled new review alerts
    const preferences = await NotificationPreference.findOne({
      where: { user_id: owner.id },
    });

    if (!preferences || !preferences.new_review_alerts) {
      logger.info(`New review alerts disabled for user ${owner.id}, skipping email`);
      return;
    }

    // Prepare review data
    const reviewData = {
      questionnaireTitle: questionnaire.title,
      rating: Math.round(averageRating), // Convert to integer stars
      reviewerName: 'Anonymous User', // Since responses are anonymous
      submittedAt: response.responseDate || response.createdAt,
      questionnaireUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/questionnaires/${questionnaire.id}`,
      reviewText: extractReviewText(processedAnswers),
    };

    // Send the email
    await emailService.sendNewReviewEmail(owner, reviewData);

    logger.info(`New review notification email sent to ${owner.email} for questionnaire ${questionnaire.id}`);
  } catch (error) {
    logger.error('Error sending new review notification email:', error);
    throw error;
  }
};

/**
 * Extract review text from processed answers
 * @param {Array} processedAnswers - Processed answers
 * @returns {string} Review text
 */
const extractReviewText = (processedAnswers) => {
  // Look for text answers that might contain review comments
  const textAnswers = processedAnswers.filter(answer =>
    answer.questionType === 'text' || answer.questionType === 'textarea',
  );

  if (textAnswers.length === 0) return '';

  // Combine all text answers
  const reviewTexts = textAnswers
    .map(answer => answer.originalValue)
    .filter(text => text && text.trim().length > 0)
    .join('\n\n');

  // Limit to reasonable length
  return reviewTexts.length > 500 ? `${reviewTexts.substring(0, 500)}...` : reviewTexts;
};

module.exports = {
  processResponse,
  getBatchProcessingStatus,
  configureBatchProcessing,
  forceProcessAllQueued,
};