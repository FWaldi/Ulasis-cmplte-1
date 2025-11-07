'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * AnalyticsKPI model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} AnalyticsKPI model
 */
module.exports = (sequelize) => {
  const AnalyticsKPI = sequelize.define(
    'AnalyticsKPI',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the KPI record',
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
        comment: 'Time period type for the KPI data',
      },
      periodDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'period_date',
        comment: 'Start date of the period (YYYY-MM-DD)',
      },
      totalResponses: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_responses',
        comment: 'Total number of responses in this period',
      },
      avgRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'avg_rating',
        comment: 'Average rating across all responses in this period',
      },
      responseRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'response_rate',
        comment: 'Response rate as percentage (0-100)',
      },
      positiveSentiment: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'positive_sentiment',
        comment: 'Percentage of positive sentiment responses',
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
      tableName: 'analytics_kpis',
      timestamps: true,
      underscored: true,
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
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  AnalyticsKPI.associate = function (models) {
    // Association with Questionnaire
    AnalyticsKPI.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get KPI summary for API responses
   * @returns {Object} KPI summary object
   */
  AnalyticsKPI.prototype.toJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      periodType: this.periodType,
      periodDate: this.periodDate,
      totalResponses: this.totalResponses,
      avgRating: this.avgRating,
      responseRate: this.responseRate,
      positiveSentiment: this.positiveSentiment,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Class methods
   */

  /**
   * Find KPIs by questionnaire and period
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type (day, week, month, year)
   * @param {Object} options - Query options
   * @returns {Array} KPI records
   */
  AnalyticsKPI.findByQuestionnaireAndPeriod = function (questionnaireId, periodType, options = {}) {
    const { limit = 30, order = [['period_date', 'DESC']] } = options;

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
   * Get latest KPI for a questionnaire and period type
   * @param {number} questionnaireId - Questionnaire ID
   * @param {string} periodType - Period type
   * @returns {Object|null} Latest KPI record
   */
  AnalyticsKPI.getLatest = function (questionnaireId, periodType) {
    return this.findOne({
      where: {
        questionnaireId,
        periodType,
      },
      order: [['period_date', 'DESC']],
    });
  };

  return AnalyticsKPI;
};