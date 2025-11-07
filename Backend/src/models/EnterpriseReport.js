'use strict';

module.exports = (sequelize, DataTypes) => {
  const EnterpriseReport = sequelize.define('EnterpriseReport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Report name or title',
    },
    type: {
      type: DataTypes.ENUM(
        'user_analytics',
        'subscription_revenue',
        'usage_statistics',
        'security_audit',
        'performance_metrics',
        'content_moderation',
        'custom',
      ),
      allowNull: false,
      comment: 'Type of report',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Report description',
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Report parameters and filters',
    },
    schedule: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Report schedule configuration',
    },
    format: {
      type: DataTypes.ENUM('json', 'csv', 'excel', 'pdf'),
      allowNull: false,
      defaultValue: 'json',
      comment: 'Output format for the report',
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'running', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Current status of the report',
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to generated report file',
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Size of generated report file in bytes',
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the report was last generated',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the report file expires and should be deleted',
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Admin user who created this report',
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether report is accessible to other admins',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'enterprise_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_by'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['expires_at'],
      },
    ],
  });

  EnterpriseReport.associate = function(models) {
    // Association to AdminUser
    EnterpriseReport.belongsTo(models.AdminUser, {
      foreignKey: 'created_by',
      as: 'creator',
    });
  };

  return EnterpriseReport;
};