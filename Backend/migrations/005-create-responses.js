'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('responses', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the response',
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
      qr_code_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Foreign key to qr_codes table (if response came from QR code)',
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      response_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date and time when the response was submitted',
      },
      device_fingerprint: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Unique device fingerprint for tracking',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the respondent (IPv4 or IPv6)',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string of the browser/client',
      },
      referrer: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Referrer URL if available',
      },
      location_data: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Geographic location data if available',
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Session identifier for tracking',
      },
      completion_time: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Time taken to complete the questionnaire in seconds',
      },
      is_complete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the response is complete',
      },
      progress_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Percentage of questionnaire completed',
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'en',
        comment: 'Language preference of the respondent',
      },
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Timezone of the respondent',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional response metadata',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the response was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the response was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Anonymous feedback submissions',
    });

    // Create indexes for performance
    // Indexes commented out to avoid duplicate key errors during initial setup
    // await queryInterface.addIndex('responses', ['questionnaire_id'], {
    //   name: 'idx_responses_questionnaire_id',
    // });
    // ... other indexes
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('responses');
  },
};
