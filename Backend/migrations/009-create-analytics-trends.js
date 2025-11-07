'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics_trends', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the trend record',
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
        comment: 'Time period type for the trend data',
      },
      period_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Specific date within the period for this data point',
      },
      avg_rating: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Average rating for this specific date',
      },
      response_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Response rate for this specific date',
      },
      trend_value: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Calculated trend value (percentage change)',
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
      comment: 'Analytics trend data by date within periods',
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_analytics_trends_questionnaire_id',
        },
        {
          fields: ['period_type'],
          name: 'idx_analytics_trends_period_type',
        },
        {
          fields: ['period_date'],
          name: 'idx_analytics_trends_period_date',
        },
        {
          fields: ['date'],
          name: 'idx_analytics_trends_date',
        },
        {
          fields: ['questionnaire_id', 'period_type', 'period_date', 'date'],
          name: 'idx_analytics_trends_composite',
          unique: true,
        },
      ],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analytics_trends');
  },
};