'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdminActivity = sequelize.define('AdminActivity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to admin user who performed the action',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action performed (e.g., CREATE_USER, UPDATE_SUBSCRIPTION)',
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Type of resource affected (user, subscription, etc.)',
    },
    resource_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the affected resource',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed information about the action performed',
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address from which the action was performed',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string of the browser/client',
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Session identifier for tracking',
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of the action in milliseconds',
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'warning'),
      allowNull: false,
      defaultValue: 'success',
      comment: 'Status of the performed action',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if action failed',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'admin_activities',
    timestamps: false,
    indexes: [
      {
        fields: ['admin_user_id'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['resource_type'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['admin_user_id', 'created_at'],
      },
    ],
  });

  AdminActivity.associate = function(models) {
    // Association to AdminUser
    AdminActivity.belongsTo(models.AdminUser, {
      foreignKey: 'admin_user_id',
      as: 'adminUser',
    });
  };

  return AdminActivity;
};