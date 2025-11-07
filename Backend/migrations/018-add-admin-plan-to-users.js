'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, we need to modify the subscription_plan enum in the users table
    // to include 'admin' as a valid option
    await queryInterface.changeColumn('users', 'subscription_plan', {
      type: Sequelize.ENUM('free', 'starter', 'business', 'admin'),
      allowNull: false,
      defaultValue: 'free',
      comment: 'Current subscription plan of user',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original enum without 'admin'
    await queryInterface.changeColumn('users', 'subscription_plan', {
      type: Sequelize.ENUM('free', 'starter', 'business'),
      allowNull: false,
      defaultValue: 'free',
      comment: 'Current subscription plan of user',
    });
  },
};