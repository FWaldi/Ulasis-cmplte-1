'use strict';

module.exports = (sequelize, DataTypes) => {
  const SubscriptionRequest = sequelize.define('SubscriptionRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    requested_plan: {
      type: DataTypes.ENUM('free', 'starter', 'business', 'admin'),
      allowNull: false,
    },
    current_plan: {
      type: DataTypes.ENUM('free', 'starter', 'business', 'admin'),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Environment-specific fields
    payment_method: {
      type: DataTypes.ENUM('dana', 'manual', 'qr_code'),
      allowNull: true,
    },
    payment_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'IDR',
    },
  }, {
    tableName: 'subscription_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['user_id', 'status'],
      },
    ],
  });

  SubscriptionRequest.associate = function(models) {
    // Association to User who made the request
    SubscriptionRequest.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // Association to User who processed the request (admin)
    SubscriptionRequest.belongsTo(models.User, {
      foreignKey: 'processed_by',
      as: 'processor',
    });
  };

  return SubscriptionRequest;
};