'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_transactions', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the payment transaction',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'User ID for payment',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      payment_method: {
        type: Sequelize.ENUM('dana'),
        allowNull: false,
        defaultValue: 'dana',
        comment: 'Payment method (DANA foundation)',
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External transaction ID',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount',
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR',
        comment: 'Currency code',
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Payment status',
      },
      subscription_plan: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Target subscription plan',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was last updated',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (processed transactions)',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'DANA payment transactions for subscription management',
      paranoid: true,
      deletedAt: 'processed_at',
      indexes: [
        {
          name: 'idx_payment_transactions_user_id',
          fields: ['user_id'],
        },
        {
          name: 'idx_payment_transactions_status',
          fields: ['status'],
        },
        {
          name: 'idx_payment_transactions_transaction_id',
          unique: true,
          fields: ['transaction_id'],
        },
        {
          name: 'idx_payment_transactions_created_at',
          fields: ['created_at'],
        },
      ],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payment_transactions');
  },
};