'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create subscription_usage table
    await queryInterface.createTable('subscription_usage', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the usage record',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'User ID for usage tracking',
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      usage_type: {
        type: Sequelize.ENUM('questionnaires', 'responses', 'exports'),
        allowNull: false,
        comment: 'Type of usage being tracked',
      },
      current_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current usage count',
      },
      limit_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Plan limit count (null for unlimited)',
      },
      reset_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Usage reset date (monthly/yearly)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the usage record was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the usage record was last updated',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Subscription usage tracking for plan limitations',
    });

    // Create payment_transactions table
    await queryInterface.createTable('payment_transactions', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the payment transaction',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'User ID for payment',
        references: {
          model: 'users',
          key: 'id',
        },
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
        comment: 'Timestamp when the transaction was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the transaction was last updated',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the payment was processed',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'DANA payment transactions for subscription management',
    });

    // Create indexes for subscription_usage
    // await queryInterface.addIndex('subscription_usage', ['user_id'], {
      // name: 'idx_subscription_usage_user_id',
    // });

    // await queryInterface.addIndex('subscription_usage', ['usage_type'], {
      // name: 'idx_subscription_usage_type',
    // });

    // await queryInterface.addIndex('subscription_usage', ['user_id', 'usage_type'], {
      // name: 'idx_subscription_usage_user_type',
      // unique: true,
    // });

    // await queryInterface.addIndex('subscription_usage', ['reset_date'], {
      // name: 'idx_subscription_usage_reset_date',
    // });

    // Create indexes for payment_transactions
    // await queryInterface.addIndex('payment_transactions', ['user_id'], {
      // name: 'idx_payment_transactions_user_id',
    // });

    // await queryInterface.addIndex('payment_transactions', ['status'], {
      // name: 'idx_payment_transactions_status',
    // });

    // await queryInterface.addIndex('payment_transactions', ['transaction_id'], {
      // name: 'idx_payment_transactions_transaction_id',
      // unique: true,
    // });

    // await queryInterface.addIndex('payment_transactions', ['created_at'], {
      // name: 'idx_payment_transactions_created_at',
    // });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payment_transactions');
    await queryInterface.dropTable('subscription_usage');
  },
};
