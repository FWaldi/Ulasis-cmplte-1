'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add composite index for analytics queries on Response table
    // Used for filtering responses by questionnaire and date range
    // await queryInterface.addIndex('responses', ['questionnaire_id', 'response_date', 'is_complete'], {
      // name: 'idx_responses_analytics_query',
    // });

    // Add composite index for analytics queries on Answer table
    // Used for filtering answers by question, validation status, and skip status
    // await queryInterface.addIndex('answers', ['question_id', 'is_skipped', 'validation_status', 'rating_score'], {
      // name: 'idx_answers_analytics_performance',
    // });

    // Add index for response date filtering in analytics
    // await queryInterface.addIndex('responses', ['response_date', 'questionnaire_id'], {
      // name: 'idx_responses_date_questionnaire',
    // });

    // Add index for answer aggregation queries
    // await queryInterface.addIndex('answers', ['response_id', 'rating_score'], {
      // name: 'idx_answers_response_rating',
    // });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('responses', 'idx_responses_analytics_query');
    await queryInterface.removeIndex('answers', 'idx_answers_analytics_performance');
    await queryInterface.removeIndex('responses', 'idx_responses_date_questionnaire');
    await queryInterface.removeIndex('answers', 'idx_answers_response_rating');
  },
};
