'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('system_metrics', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique metric entry identifier',
      },
      metric_type: {
        type: Sequelize.ENUM('cpu', 'memory', 'disk', 'network', 'api_response_time', 'error_rate'),
        allowNull: false,
        comment: 'Type of metric',
      },
      metric_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Metric value',
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Unit of measurement (percentage, MB, seconds, etc.)',
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Metric collection timestamp',
      },
      server_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Server identifier for multi-server deployments',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Record creation timestamp',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'System performance and health metrics',
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('system_metrics');
  },
};