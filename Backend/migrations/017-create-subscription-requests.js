'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription_requests', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      requested_plan: {
        type: Sequelize.ENUM('free', 'starter', 'business', 'admin'),
        allowNull: false,
      },
      current_plan: {
        type: Sequelize.ENUM('free', 'starter', 'business', 'admin'),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      processed_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payment_method: {
        type: Sequelize.ENUM('dana', 'manual', 'qr_code'),
        allowNull: true,
      },
      payment_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: 'IDR',
      },
    });

    // Add indexes
    await queryInterface.addIndex('subscription_requests', ['user_id']);
    await queryInterface.addIndex('subscription_requests', ['status']);
    await queryInterface.addIndex('subscription_requests', ['created_at']);
    await queryInterface.addIndex('subscription_requests', ['user_id', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription_requests');
  },
};