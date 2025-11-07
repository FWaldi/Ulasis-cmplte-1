'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * AnalyticsBreakdown model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} AnalyticsBreakdown model
 */
module.exports = (sequelize) => {
  const AnalyticsBreakdown = sequelize.define(
    'AnalyticsBreakdown',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the breakdown record',
      },
      questionnaireId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'questionnaire_id',
        comment: 'Reference to the questionnaire',
      },
      periodType: {
        type: DataTypes.ENUM('day', 'week', 'month', 'year'),
        allowNull: false,
        field: 'period_type',
        comment: 'Time period type for the breakdown data',
      },
      periodDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'period_date',
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      area: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Category or area name (e.g., Service Quality, Staff Performance)',
      },
      avgRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'avg_rating',
        comment: 'Average rating for this area',
      },
      responses: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of responses for this area',
      },
      trend: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Trend percentage change from previous period',
      },
      status: {
        type: DataTypes.ENUM('Good', 'Monitor', 'Urgent'),
        allowNull: false,
        defaultValue: 'Monitor',
        comment: 'Status indicator based on rating and trend',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the record was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the record was last updated',
      },
    },
    {
      tableName: 'analytics_breakdown',
      timestamps: true,
      underscored: true,
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
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  AnalyticsBreakdown.associate = function (models) {
    // Association with Questionnaire
    AnalyticsBreakdown.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get breakdown summary for API responses
   * @returns {Object} Breakdown summary object
   */
  AnalyticsBreakdown.prototype.toJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      periodType: this.periodType,
      periodDate: this.periodDate,
      area: this.area,
      avgRating: this.avgRating,
      responses: this.responses,
      trend: this.trend,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Class methods
   */

  /**
   * Find breakdown by questionnaire and period
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type (day, week, month, year)
   * @param {Object} options - Query options
   * @returns {Array} Breakdown records
   */
  AnalyticsBreakdown.findByQuestionnaireAndPeriod = function (questionnaireId, periodType, options = {}) {
    const { limit = 50, order = [['avg_rating', 'DESC']] } = options;

    return this.findAll({
      where: {
        questionnaireId,
        periodType,
      },
      limit,
      order,
    });
  };

  /**
   * Get breakdown data for a specific period
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type
   * @param {string} periodDate - Period start date
   * @returns {Array} Breakdown records for the period
   */
  AnalyticsBreakdown.getPeriodData = function (questionnaireId, periodType, periodDate) {
    return this.findAll({
      where: {
        questionnaireId,
        periodType,
        periodDate,
      },
      order: [['avg_rating', 'DESC']],
    });
  };

  /**
   * Get breakdown by status
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} status - Status (Good, Monitor, Urgent)
   * @returns {Array} Breakdown records with the specified status
   */
  AnalyticsBreakdown.getByStatus = function (questionnaireId, status) {
    return this.findAll({
      where: {
        questionnaireId,
        status,
      },
      order: [['avg_rating', 'ASC']],
    });
  };

  return AnalyticsBreakdown;
};