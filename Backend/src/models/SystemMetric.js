'use strict';

const { Model } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize, DataTypes) => {
  class SystemMetric extends Model {
    static associate(_models) {
      // Define associations if needed
    }
  }

  SystemMetric.init({
    id: {
      type: getDataType('BIGINT'),
      primaryKey: true,
      autoIncrement: true,
      comment: 'Unique metric entry identifier',
    },
    metric_type: {
      type: DataTypes.ENUM('cpu', 'memory', 'disk', 'network', 'api_response_time', 'error_rate'),
      allowNull: false,
      comment: 'Type of metric',
    },
    metric_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Metric value',
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Unit of measurement (percentage, MB, seconds, etc.)',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Metric collection timestamp',
    },
    server_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Server identifier for multi-server deployments',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record creation timestamp',
    },
  }, {
    sequelize,
    modelName: 'SystemMetric',
    tableName: 'system_metrics',
    timestamps: false,
    indexes: [
      {
        fields: ['metric_type'],
        name: 'idx_system_metrics_metric_type',
      },
      {
        fields: ['timestamp'],
        name: 'idx_system_metrics_timestamp',
      },
    ],
  });

  return SystemMetric;
};