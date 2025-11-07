'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if columns already exist before adding them
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        comment: 'User role for access control'
      });
    }

    if (!tableDescription.mfa_secret) {
      await queryInterface.addColumn('users', 'mfa_secret', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'TOTP secret for multi-factor authentication'
      });
    }

    if (!tableDescription.mfa_enabled) {
      await queryInterface.addColumn('users', 'mfa_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether MFA is enabled for this user'
      });
    }

    if (!tableDescription.failed_login_ips) {
      await queryInterface.addColumn('users', 'failed_login_ips', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of IPs with failed login attempts for security monitoring'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'failed_login_ips');
    await queryInterface.removeColumn('users', 'mfa_enabled');
    await queryInterface.removeColumn('users', 'mfa_secret');
    await queryInterface.removeColumn('users', 'role');
  }
};
