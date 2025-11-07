'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics_kpis', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the KPI record',
      },
      questionnaire_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Reference to the questionnaire',
        references: {
          model: 'questionnaires',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      period_type: {
        type: Sequelize.ENUM('day', 'week', 'month', 'year'),
        allowNull: false,
        comment: 'Time period type for the KPI data',
      },
      period_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      total_responses: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of responses in this period',
      },
      avg_rating: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Average rating across all responses in this period',
      },
      response_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Response rate as percentage (0-100)',
      },
      positive_sentiment: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage of positive sentiment responses',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was last updated',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Analytics KPI data by period',
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_analytics_kpis_questionnaire_id',
        },
        {
          fields: ['period_type'],
          name: 'idx_analytics_kpis_period_type',
        },
        {
          fields: ['period_date'],
          name: 'idx_analytics_kpis_period_date',
        },
        {
          fields: ['questionnaire_id', 'period_type', 'period_date'],
          name: 'idx_analytics_kpis_composite',
          unique: true,
        },
      ],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analytics_kpis');
  },
};