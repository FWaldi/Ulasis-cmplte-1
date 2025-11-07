'use strict';

const { DataTypes } = require('sequelize');

/**
 * Helper function to get appropriate data type based on environment
 * SQLite doesn't support UNSIGNED integers, so we use regular integers in test environment
 * @param {string} baseType - Base data type ('BIGINT' or 'INTEGER')
 * @returns {Object} Appropriate data type
 */
const getDataType = (baseType) => {
  const nodeEnv = (process.env.NODE_ENV || '').trim();
  const isTestEnv = nodeEnv === 'test';

  switch (baseType) {
    case 'BIGINT':
      return isTestEnv ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;
    case 'INTEGER':
      return isTestEnv ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED;
    default:
      throw new Error(`Unsupported data type: ${baseType}`);
  }
};

module.exports = {
  getDataType,
};
