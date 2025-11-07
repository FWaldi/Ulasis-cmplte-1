const request = require('supertest');
const express = require('express');

const app = express();
app.get('/test', (req, res) => {
  res.json({ message: 'ok' });
});

describe('Supertest test', () => {
  test('should work', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);
    expect(response.body.message).toBe('ok');
  });
});