'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdminRole = sequelize.define('AdminRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'support', 'analyst'),
      allowNull: false,
      unique: true,
      comment: 'Admin role type with different permission levels',
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Human-readable role name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Role description and responsibilities',
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of specific permissions for this role',
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Hierarchy level for role-based access control',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this role is currently active',
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
    tableName: 'admin_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['name'],
        unique: true,
      },
      {
        fields: ['level'],
      },
      {
        fields: ['is_active'],
      },
    ],
  });

  AdminRole.associate = function(models) {
    // Association to AdminUser
    AdminRole.hasMany(models.AdminUser, {
      foreignKey: 'role_id',
      as: 'adminUsers',
    });
  };

  return AdminRole;
};