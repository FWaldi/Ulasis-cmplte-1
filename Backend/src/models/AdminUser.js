'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdminUser = sequelize.define('AdminUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'Reference to the main user account',
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to admin role',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Department or division this admin belongs to',
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional custom permissions beyond role defaults',
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last admin dashboard login time',
    },
    login_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of admin dashboard logins',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this admin account is active',
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether 2FA is enabled for this admin',
    },
    two_factor_secret: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: 'Secret key for two-factor authentication',
    },
    api_access_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether API access is enabled for this admin',
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API key for programmatic access',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'admin_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
      },
      {
        fields: ['role_id'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['api_key'],
        unique: true,
      },
    ],
  });

  AdminUser.associate = function(models) {
    // Association to User
    AdminUser.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // Association to AdminRole
    AdminUser.belongsTo(models.AdminRole, {
      foreignKey: 'role_id',
      as: 'role',
    });

    // Association to AdminActivity
    AdminUser.hasMany(models.AdminActivity, {
      foreignKey: 'admin_user_id',
      as: 'activities',
    });
  };

  return AdminUser;
};