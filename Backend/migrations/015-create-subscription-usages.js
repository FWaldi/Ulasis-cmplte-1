'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription_usage', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the usage record',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'User ID for usage tracking',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
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
        comment: 'Timestamp when the record was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was last updated',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Subscription usage tracking for plan limitations',
      indexes: [
        {
          name: 'idx_subscription_usage_user_id',
          fields: ['user_id'],
        },
        {
          name: 'idx_subscription_usage_type',
          fields: ['usage_type'],
        },
        {
          name: 'idx_subscription_usage_user_type',
          unique: true,
          fields: ['user_id', 'usage_type'],
        },
        {
          name: 'idx_subscription_usage_reset_date',
          fields: ['reset_date'],
        },
      ],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription_usage');
  },
};