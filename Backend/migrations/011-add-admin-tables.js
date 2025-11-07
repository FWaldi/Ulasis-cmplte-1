'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tables already created manually or in previous runs
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('users', 'idx_users_role');
    await queryInterface.removeIndex('system_metrics', 'idx_system_metrics_timestamp');
    await queryInterface.removeIndex('system_metrics', 'idx_system_metrics_metric_type');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_timestamp');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_resource_type');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_action');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_user_id');

    // Drop tables
    await queryInterface.dropTable('system_metrics');
    await queryInterface.dropTable('audit_logs');

    // Remove role column
    await queryInterface.removeColumn('users', 'role');
  },
};