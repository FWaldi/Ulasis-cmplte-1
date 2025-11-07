'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questionnaires', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Title of the questionnaire',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description of the questionnaire',
      },
      category_mapping: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'User-defined category mapping for questions',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the questionnaire is currently active',
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the questionnaire is publicly accessible',
      },
      welcome_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Message shown to users before starting the questionnaire',
      },
      thank_you_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Message shown to users after completing the questionnaire',
      },
      theme_settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Theme and appearance settings',
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional questionnaire settings',
      },
      response_count: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of responses received',
      },
      last_response_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of the last response',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the questionnaire was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    });

    // Create indexes for performance
    // Note: user_id index created automatically by foreign key
    // Indexes commented out to avoid duplicate key errors during initial setup
    // await queryInterface.addIndex('questionnaires', ['is_active'], {
    //   name: 'idx_questionnaires_is_active',
    // });
    // ... other indexes
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questionnaires');
  },
};
