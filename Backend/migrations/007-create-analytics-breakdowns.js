'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics_breakdown', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the breakdown record',
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
        comment: 'Time period type for the breakdown data',
      },
      period_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      area: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Category or area name (e.g., Service Quality, Staff Performance)',
      },
      avg_rating: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Average rating for this area',
      },
      responses: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of responses for this area',
      },
      trend: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Trend percentage change from previous period',
      },
      status: {
        type: Sequelize.ENUM('Good', 'Monitor', 'Urgent'),
        allowNull: false,
        defaultValue: 'Monitor',
        comment: 'Status indicator based on rating and trend',
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
      comment: 'Analytics breakdown data by area and period',
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_analytics_breakdown_questionnaire_id',
        },
        {
          fields: ['period_type'],
          name: 'idx_analytics_breakdown_period_type',
        },
        {
          fields: ['period_date'],
          name: 'idx_analytics_breakdown_period_date',
        },
        {
          fields: ['area'],
          name: 'idx_analytics_breakdown_area',
        },
        {
          fields: ['status'],
          name: 'idx_analytics_breakdown_status',
        },
        {
          fields: ['questionnaire_id', 'period_type', 'period_date', 'area'],
          name: 'idx_analytics_breakdown_composite',
          unique: true,
        },
      ],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analytics_breakdown');
  },
};