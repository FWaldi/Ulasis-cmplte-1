'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const PaymentTransaction = sequelize.define(
    'PaymentTransaction',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the payment transaction',
      },
      user_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'User ID for payment',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      payment_method: {
        type: DataTypes.ENUM('dana'),
        allowNull: false,
        defaultValue: 'dana',
        comment: 'Payment method (DANA foundation)',
      },
      transaction_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'External transaction ID',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'IDR',
        comment: 'Currency code',
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Payment status',
      },
      subscription_plan: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Target subscription plan',
      },
    },
    {
      tableName: 'payment_transactions',
      // Only use MySQL-specific options in non-test environments
      ...(process.env.NODE_ENV !== 'test' && {
        engine: 'InnoDB',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }),
      comment: 'DANA payment transactions for subscription management',
      // Only add indexes in non-test environments to avoid SQLite compatibility issues
      ...(process.env.NODE_ENV !== 'test' && {
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
      }),
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'processed_at', // Use processed_at as deletedAt for soft deletes
      paranoid: true,
    },
  );

  // Associations
  PaymentTransaction.associate = (models) => {
    PaymentTransaction.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return PaymentTransaction;
};