'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * AnalyticsTrend model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} AnalyticsTrend model
 */
module.exports = (sequelize) => {
  const AnalyticsTrend = sequelize.define(
    'AnalyticsTrend',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the trend record',
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
        comment: 'Time period type for the trend data',
      },
      periodDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'period_date',
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Specific date within the period for this data point',
      },
      avgRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'avg_rating',
        comment: 'Average rating for this specific date',
      },
      responseRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'response_rate',
        comment: 'Response rate for this specific date',
      },
      trendValue: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'trend_value',
        comment: 'Calculated trend value (percentage change)',
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
      tableName: 'analytics_trends',
      timestamps: true,
      underscored: true,
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
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  AnalyticsTrend.associate = function (models) {
    // Association with Questionnaire
    AnalyticsTrend.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get trend summary for API responses
   * @returns {Object} Trend summary object
   */
  AnalyticsTrend.prototype.toJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      periodType: this.periodType,
      periodDate: this.periodDate,
      date: this.date,
      avgRating: this.avgRating,
      responseRate: this.responseRate,
      trendValue: this.trendValue,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Class methods
   */

  /**
   * Find trends by questionnaire and period
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type (day, week, month, year)
   * @param {Object} options - Query options
   * @returns {Array} Trend records
   */
  AnalyticsTrend.findByQuestionnaireAndPeriod = function (questionnaireId, periodType, options = {}) {
    const { limit = 30, order = [['date', 'ASC']] } = options;

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
   * Get trend data for a specific period
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type
   * @param {string} periodDate - Period start date
   * @returns {Array} Trend records for the period
   */
  AnalyticsTrend.getPeriodData = function (questionnaireId, periodType, periodDate) {
    return this.findAll({
      where: {
        questionnaireId,
        periodType,
        periodDate,
      },
      order: [['date', 'ASC']],
    });
  };

  return AnalyticsTrend;
};