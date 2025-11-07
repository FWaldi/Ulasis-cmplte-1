'use strict';

const { Model } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      // Define associations
      AuditLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  AuditLog.init({
    id: {
      type: getDataType('BIGINT'),
      primaryKey: true,
      autoIncrement: true,
      comment: 'Unique audit entry identifier',
    },
    user_id: {
      type: getDataType('BIGINT'),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who performed action (nullable for system actions)',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)',
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of resource affected (user, questionnaire, response, etc.)',
    },
    resource_id: {
      type: getDataType('BIGINT'),
      allowNull: true,
      comment: 'ID of affected resource',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional action details and metadata',
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Client IP address',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/client user agent',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Action timestamp',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record creation timestamp',
    },
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false, // We have custom timestamp fields
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_audit_logs_user_id',
      },
      {
        fields: ['action'],
        name: 'idx_audit_logs_action',
      },
      {
        fields: ['resource_type'],
        name: 'idx_audit_logs_resource_type',
      },
      {
        fields: ['timestamp'],
        name: 'idx_audit_logs_timestamp',
      },
    ],
  });

  return AuditLog;
};