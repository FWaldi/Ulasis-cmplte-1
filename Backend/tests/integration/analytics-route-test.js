'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');

describe('Analytics Route Basic Test', () => {
  it('should return 401 for unauthenticated request to analytics endpoint', async () => {
    await request(app)
      .get('/api/v1/analytics/bubble/123')
      .expect(401);
  });

  it('should return 401 for unauthenticated request to analytics summary endpoint', async () => {
    await request(app)
      .get('/api/v1/analytics/summary/123')
      .expect(401);
  });
});