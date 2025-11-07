'use strict';

const { DataTypes, Op } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * Response model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} Response model
 */
module.exports = (sequelize) => {
  const Response = sequelize.define(
    'Response',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the response',
      },
      questionnaireId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'questionnaire_id',
        comment: 'Foreign key to questionnaires table',
      },
      qrCodeId: {
        type: getDataType('BIGINT'),
        allowNull: true,
        field: 'qr_code_id',
        comment: 'Foreign key to qr_codes table (if response came from QR code)',
      },
      responseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'response_date',
        comment: 'Date and time when the response was submitted',
      },
      deviceFingerprint: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'device_fingerprint',
        comment: 'Unique device fingerprint for tracking',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address',
        comment: 'IP address of respondent (IPv4 or IPv6)',
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent',
        comment: 'User agent string of browser/client',
      },
      referrer: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Referrer URL if available',
      },
      locationData: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'location_data',
        comment: 'Geographic location data if available',
      },
      sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'session_id',
        comment: 'Session identifier for tracking',
      },
      completionTime: {
        type: getDataType('INTEGER'),
        allowNull: true,
        field: 'completion_time',
        comment: 'Time taken to complete the questionnaire in seconds',
      },
      isComplete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_complete',
        comment: 'Whether the response is complete',
      },
      progressPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: 'progress_percentage',
        comment: 'Percentage of questionnaire completed',
      },
      language: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'en',
        comment: 'Language preference of respondent',
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Timezone of respondent',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional response metadata',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the response was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the response was last updated',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    },
    {
      tableName: 'responses',
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true, // Use snake_case for column names
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_responses_questionnaire_id',
        },
        {
          fields: ['qr_code_id'],
          name: 'idx_responses_qr_code_id',
        },
        {
          fields: ['response_date'],
          name: 'idx_responses_response_date',
        },
        {
          fields: ['device_fingerprint'],
          name: 'idx_responses_device_fingerprint',
        },
        {
          fields: ['ip_address'],
          name: 'idx_responses_ip_address',
        },
        {
          fields: ['is_complete'],
          name: 'idx_responses_is_complete',
        },
        {
          fields: ['progress_percentage'],
          name: 'idx_responses_progress_percentage',
        },
        {
          fields: ['created_at'],
          name: 'idx_responses_created_at',
        },
        {
          fields: ['deleted_at'],
          name: 'idx_responses_deleted_at',
        },
        {
          fields: ['questionnaire_id', 'response_date'],
          name: 'idx_responses_questionnaire_date',
        },
        {
          fields: ['qr_code_id', 'response_date'],
          name: 'idx_responses_qr_code_date',
        },
        {
          fields: ['questionnaire_id', 'is_complete', 'deleted_at'],
          name: 'idx_responses_complete_in_questionnaire',
        },
        {
          fields: ['device_fingerprint', 'response_date'],
          name: 'idx_responses_device_date',
        },
      ],
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  Response.associate = function (models) {
    // Association with Questionnaire (many-to-one)
    Response.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });

    // Association with QR Code (many-to-one, optional)
    Response.belongsTo(models.QRCode, {
      foreignKey: 'qrCodeId',
      as: 'qrCode',
    });

    // Association with Answers (one-to-many)
    Response.hasMany(models.Answer, {
      foreignKey: 'responseId',
      as: 'answers',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get response summary for API responses
   * @returns {Object} Response summary object
   */
  Response.prototype.toSummaryJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      qrCodeId: this.qrCodeId,
      responseDate: this.responseDate,
      completionTime: this.completionTime,
      isComplete: this.isComplete,
      progressPercentage: this.progressPercentage,
      language: this.language,
      createdAt: this.createdAt,
    };
  };

  /**
   * Update progress based on answered questions
   * @param {number} totalQuestions - Total number of questions in questionnaire
   * @returns {Promise<void>}
   */
  Response.prototype.updateProgress = async function (totalQuestions) {
    const answeredCount = await require('./Answer')(sequelize).count({
      where: {
        responseId: this.id,
        isSkipped: false,
      },
    });

    this.progressPercentage =
      totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100 * 100) / 100 : 0;

    this.isComplete = this.progressPercentage >= 100;
    await this.save();
  };

  /**
   * Class methods
   */

  /**
   * Find responses by questionnaire with pagination
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Object} options - Query options
   * @returns {Object} Paginated responses with metadata
   */
  Response.findByQuestionnairePaginated = async function (questionnaireId, options = {}) {
    const {
      page = 1,
      limit = 10,
      includeIncomplete = false,
      dateFrom = null,
      dateTo = null,
    } = options;

    const offset = (page - 1) * limit;
    const whereClause = { questionnaireId };

    if (!includeIncomplete) {
      whereClause.isComplete = true;
    }

    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) {
        whereClause.responseDate[sequelize.Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.responseDate[sequelize.Op.lte] = new Date(dateTo);
      }
    }

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['responseDate', 'DESC']],
      include: [
        {
          model: require('./Answer')(sequelize),
          as: 'answers',
          attributes: ['id', 'questionId', 'answerValue', 'ratingScore', 'isSkipped'],
          required: false,
        },
      ],
    });

    return {
      responses: rows.map((response) => response.toSummaryJSON()),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  };

  /**
   * Get response statistics for a questionnaire
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Object} options - Query options
   * @returns {Object} Response statistics
   */
  Response.getStatistics = async function (questionnaireId, options = {}) {
    const { dateFrom = null, dateTo = null } = options;

    const whereClause = { questionnaireId };
    if (dateFrom || dateTo) {
      whereClause.responseDate = {};
      if (dateFrom) {
        whereClause.responseDate[sequelize.Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.responseDate[sequelize.Op.lte] = new Date(dateTo);
      }
    }

    const [totalResponses, completeResponses, averageCompletionTime, averageProgress] =
      await Promise.all([
        this.count({ where: whereClause }),
        this.count({ where: { ...whereClause, is_complete: true } }),
        sequelize.query(
          'SELECT AVG(completion_time) as avg_completion_time FROM Responses WHERE questionnaireId = :questionnaireId AND is_complete = true AND completion_time IS NOT NULL',
          {
            replacements: { questionnaireId },
            type: sequelize.QueryTypes.SELECT,
          },
        ).then(result => result[0]?.avg_completion_time || null).catch(() => null),
        sequelize.query(
          'SELECT AVG(progress_percentage) as avg_progress FROM Responses WHERE questionnaireId = :questionnaireId',
          {
            replacements: { questionnaireId },
            type: sequelize.QueryTypes.SELECT,
          },
        ).then(result => result[0]?.avg_progress || null).catch(() => null),
      ]);

    return {
      totalResponses,
      completeResponses,
      incompleteResponses: totalResponses - completeResponses,
      completionRate:
        totalResponses > 0 ? Math.round((completeResponses / totalResponses) * 100) : 0,
      averageCompletionTime: Math.round(averageCompletionTime || 0),
      averageProgress: Math.round((averageProgress || 0) * 100) / 100,
    };
  };

  return Response;
};
