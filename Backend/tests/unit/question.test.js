'use strict';

const request = require('supertest');
const express = require('express');
const { sequelize } = require('../../src/config/database');
const { Questionnaire, Question, User } = require('../../src/models');
const { generateTestToken } = require('../helpers/auth');

const app = express();
app.use(express.json());
app.use('/api/v1/questionnaires', require('../../src/routes/questionnaires'));
app.use('/api/v1/questions', require('../../src/routes/questions'));

describe('Question API', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create a test user for the test
    const { User } = require('../../src/models');
    await User.createWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123',
      first_name: 'Test',
      last_name: 'User',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create a new question for a questionnaire', async () => {
    // Use the test user created in setup.js (ID: 1)
    const user = await User.findByPk(1);
    const questionnaire = await Questionnaire.create({ userId: user.id, title: 'Test Questionnaire' });
    const authToken = generateTestToken(user);

    const response = await request(app)
      .post(`/api/v1/questionnaires/${questionnaire.id}/questions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ questionText: 'New Question', questionType: 'text' })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});