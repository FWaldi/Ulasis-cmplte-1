'use strict';

const { DataTypes, Op } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * Questionnaire model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} Questionnaire model
 */
module.exports = (sequelize) => {
  const Questionnaire = sequelize.define(
    'Questionnaire',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the questionnaire',
      },
      userId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'user_id',
        comment: 'Foreign key to users table',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
        comment: 'Title of the questionnaire',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed description of the questionnaire',
      },
      categoryMapping: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'category_mapping',
        comment: 'User-defined category mapping for questions',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Whether the questionnaire is currently active',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_public',
        comment: 'Whether the questionnaire is publicly accessible',
      },
      welcomeMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'welcome_message',
        comment: 'Message shown to users before starting the questionnaire',
      },
      thankYouMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'thank_you_message',
        comment: 'Message shown to users after completing the questionnaire',
      },
      themeSettings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'theme_settings',
        comment: 'Theme and appearance settings',
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional questionnaire settings',
      },
      responseCount: {
        type: getDataType('BIGINT'),
        allowNull: false,
        defaultValue: 0,
        field: 'response_count',
        comment: 'Total number of responses received',
      },
      lastResponseAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_response_at',
        comment: 'Timestamp of the last response',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the questionnaire was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the questionnaire was last updated',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    },
    {
      tableName: 'questionnaires',
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true, // Use snake_case for column names
      indexes: [
        {
          fields: ['user_id'],
          name: 'idx_questionnaires_user_id',
        },
        {
          fields: ['is_active'],
          name: 'idx_questionnaires_is_active',
        },
        {
          fields: ['is_public'],
          name: 'idx_questionnaires_is_public',
        },
        {
          fields: ['created_at'],
          name: 'idx_questionnaires_created_at',
        },
        {
          fields: ['updated_at'],
          name: 'idx_questionnaires_updated_at',
        },
        {
          fields: ['deleted_at'],
          name: 'idx_questionnaires_deleted_at',
        },
        {
          fields: ['response_count'],
          name: 'idx_questionnaires_response_count',
        },
        {
          fields: ['user_id', 'is_active', 'deleted_at'],
          name: 'idx_questionnaires_user_active',
        },
      ],
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  Questionnaire.associate = function (models) {
    // Association with User
    Questionnaire.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Association with Questions (one-to-many)
    Questionnaire.hasMany(models.Question, {
      foreignKey: 'questionnaireId',
      as: 'questions',
    });

    // Association with QR Codes (one-to-many)
    Questionnaire.hasMany(models.QRCode, {
      foreignKey: 'questionnaireId',
      as: 'qrCodes',
    });

    // Association with Responses (one-to-many) - commented out due to model loading issues
    // Questionnaire.hasMany(models.Response, {
    //   foreignKey: 'questionnaireId',
    //   as: 'responses',
    // });

    // Association with Analytics KPI (one-to-many)
    Questionnaire.hasMany(models.AnalyticsKPI, {
      foreignKey: 'questionnaireId',
      as: 'analyticsKPIs',
    });

    // Association with Analytics Trends (one-to-many)
    Questionnaire.hasMany(models.AnalyticsTrend, {
      foreignKey: 'questionnaireId',
      as: 'analyticsTrends',
    });

    // Association with Analytics Breakdown (one-to-many)
    Questionnaire.hasMany(models.AnalyticsBreakdown, {
      foreignKey: 'questionnaireId',
      as: 'analyticsBreakdown',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get questionnaire summary for API responses
   * @returns {Object} Questionnaire summary object
   */
  Questionnaire.prototype.toSummaryJSON = function () {
    // Convert categoryMapping arrays to objects with numeric keys for API consistency
    const categoryMapping = this.categoryMapping || {};
    const convertedMapping = {};

    Object.keys(categoryMapping).forEach(key => {
      const value = categoryMapping[key];
      if (Array.isArray(value)) {
        // Convert array to object with numeric keys
        convertedMapping[key] = {};
        value.forEach((item, index) => {
          convertedMapping[key][index.toString()] = item;
        });
      } else {
        convertedMapping[key] = value;
      }
    });

    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      categoryMapping: convertedMapping,
      isActive: this.isActive,
      isPublic: this.isPublic,
      responseCount: this.responseCount,
      lastResponseAt: this.lastResponseAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Get full questionnaire details for API responses
   * @returns {Object} Full questionnaire details object
   */
  Questionnaire.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    // Remove sensitive or internal fields if needed
    delete values.deletedAt;

    // Convert categoryMapping arrays to objects with numeric keys for API consistency
    if (values.categoryMapping) {
      const convertedMapping = {};
      Object.keys(values.categoryMapping).forEach(key => {
        const value = values.categoryMapping[key];
        if (Array.isArray(value)) {
          // Convert array to object with numeric keys
          convertedMapping[key] = {};
          value.forEach((item, index) => {
            convertedMapping[key][index.toString()] = item;
          });
        } else {
          convertedMapping[key] = value;
        }
      });
      values.categoryMapping = convertedMapping;
    }

    return values;
  };

  /**
   * Class methods
   */

  /**
   * Find questionnaires by user with pagination
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10)
   * @param {boolean} options.includeInactive - Include inactive questionnaires
   * @returns {Object} Paginated questionnaires with metadata
   */
  Questionnaire.findByUserPaginated = async function (userId, options = {}) {
    const { page = 1, limit = 10, includeInactive = false, category, dateFrom, dateTo } = options;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    // Add category filtering to where clause if specified
    if (category) {
      whereClause[Op.or] = [
        { categoryMapping: { [Op.like]: `%"${category}"%` } },
        { categoryMapping: { [Op.like]: `%"${category}":%` } },
      ];
    }

    // Add date range filtering to where clause if specified
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.Question,
          as: 'questions',
          attributes: ['id', 'questionText', 'questionType', 'category', 'orderIndex'],
          where: { isActive: true },
          required: false,
        },
      ],
    });

    const questionnaires = rows.map((questionnaire) => questionnaire.toSummaryJSON());

    return {
      questionnaires,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  };

  /**
   * Check if user can create more questionnaires based on subscription
   * @param {number} userId - User ID
   * @param {string} subscriptionPlan - User's subscription plan
   * @returns {Object} Result with canCreate and current usage
   */
  Questionnaire.checkUserQuota = async function (userId, subscriptionPlan = 'free') {
    const limits = {
      free: 1,
      starter: 5,
      business: Infinity,
    };

    const limit = limits[subscriptionPlan] || limits.free;

    if (limit === Infinity) {
      return { canCreate: true, used: 0, limit: 'unlimited', plan: subscriptionPlan };
    }

    const used = await this.count({
      where: { userId },
      paranoid: false, // Include soft-deleted records in count
    });

    return {
      canCreate: used < limit,
      used,
      limit,
      plan: subscriptionPlan,
    };
  };

  return Questionnaire;
};
