'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('qr_codes', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the QR code',
      },
      questionnaire_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Foreign key to questionnaires table',
        references: {
          model: 'questionnaires',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      qr_code_data: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Encoded QR code data (URL or identifier)',
      },
      qr_code_image: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to generated QR code image file',
      },
      location_tag: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Physical location or placement identifier',
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to custom logo embedded in QR code',
      },
      custom_colors: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Custom color scheme for QR code',
      },
      size: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 200,
        comment: 'QR code image size in pixels',
      },
      error_correction_level: {
        type: Sequelize.ENUM('L', 'M', 'Q', 'H'),
        allowNull: false,
        defaultValue: 'M',
        comment: 'Error correction level for QR code',
      },
      scan_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of times this QR code has been scanned',
      },
      unique_scans: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of unique scans (by device/IP)',
      },
      last_scan_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of the last scan',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this QR code is currently active',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration date for the QR code (null for no expiration)',
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional QR code settings',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the QR code was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the QR code was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    });

    // Create indexes for performance
    // Indexes commented out to avoid duplicate key errors during initial setup
    // await queryInterface.addIndex('qr_codes', ['questionnaire_id'], {
    //   name: 'idx_qr_codes_questionnaire_id',
    // });
    // ... other indexes
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('qr_codes');
  },
};
