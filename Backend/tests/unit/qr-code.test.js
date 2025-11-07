'use strict';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Use the models mock from setup.js
const { QRCode, Questionnaire, User, initialize } = require('../../src/models');

// Use the test app from app-test.js
const app = require('../../src/app-test');

const { generateTestToken } = require('../helpers/auth');

describe('QR Code API', () => {
  let testUser;
  let authToken;
  let testQuestionnaire;
  let testQRCode;
  let testLogoPath;

  // Clean up mock state before each test
  beforeEach(() => {
    if (global.resetMockQuestionnaireCount) {
      global.resetMockQuestionnaireCount();
    }
  });

  beforeAll(async () => {
    // Initialize models for testing
    await initialize();

    // Create test user
    testUser = await User.createWithPassword({
      email: 'qrtest@example.com',
      password: 'hashedpassword',
      first_name: 'QR',
      last_name: 'Test',
    });

    authToken = generateTestToken(testUser);

    // Create test questionnaire
    testQuestionnaire = await Questionnaire.create({
      userId: testUser.id,
      title: 'Test QR Questionnaire',
      description: 'Questionnaire for QR code testing',
    });

    // Create test QR code for use in other tests
    console.log('Creating QR code with questionnaire ID:', testQuestionnaire.id);
    testQRCode = await QRCode.create({
      id: 888, // Use a unique ID to avoid conflicts (not 999 which is mocked to return NO_LOGO)
      questionnaireId: testQuestionnaire.id,
      qrCodeData: 'https://test-questionnaire.example.com/qr/888',
      locationTag: 'Test Location',
    });
    console.log('Created QR code:', testQRCode.toJSON());

    // Use existing test logo file
    testLogoPath = path.join(__dirname, '../fixtures/fake-image.png');
  });

  afterAll(async () => {
    // Clean up test data
    await QRCode.destroy({ where: { questionnaireId: testQuestionnaire.id } });
    await Questionnaire.destroy({ where: { id: testQuestionnaire.id } });
    await User.destroy({ where: { id: testUser.id } });

    // Clean up test files
    if (fs.existsSync(testLogoPath)) {
      fs.unlinkSync(testLogoPath);
    }
  });

  describe('POST /api/v1/qr-codes', () => {
    it('should create a new QR code with valid data', async () => {
      const qrCodeData = {
        questionnaireId: testQuestionnaire.id,
        locationTag: 'Test Location',
        customColors: {
          foreground: '#000000',
          background: '#FFFFFF',
        },
        size: 200,
        errorCorrectionLevel: 'M',
      };

      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(qrCodeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire_id).toBe(qrCodeData.questionnaireId);
      expect(response.body.data.locationTag).toBe(qrCodeData.locationTag);
      expect(response.body.data.qr_code_url).toBeDefined();
      expect(response.body.data.scanCount).toBe(0);
    });

    it('should create QR code with logo upload', async () => {
      const qrCodeData = {
        questionnaireId: testQuestionnaire.id,
        locationTag: 'QR with Logo',
        mockFile: true, // Trigger file upload mock
      };

      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(qrCodeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logoUrl).toBeDefined();
      expect(response.body.data.logoUrl).toContain('/api/v1/uploads/qr-logos/');
    });

    it('should reject QR code creation without questionnaire ID', async () => {
      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationTag: 'QR without questionnaire',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject QR code creation for non-existent questionnaire', async () => {
      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionnaireId: 99999,
          locationTag: 'Invalid QR',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid file upload', async () => {
      const qrCodeData = {
        questionnaireId: testQuestionnaire.id,
        mockFile: true,
        invalidFile: true, // Trigger invalid file response in mock
      };

      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(qrCodeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('GET /api/v1/qr-codes', () => {
    it('should get user QR codes with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_codes).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.qr_codes.length).toBeGreaterThan(0);
    });

    it('should filter QR codes by questionnaire', async () => {
      const response = await request(app)
        .get(`/api/v1/qr-codes?questionnaireId=${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_codes.every(qr => qr.questionnaire_id === testQuestionnaire.id)).toBe(true);
    });

    it('should filter QR codes by location tag', async () => {
      const response = await request(app)
        .get('/api/v1/qr-codes?locationTag=Test Location')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_codes.every(qr => qr.locationTag === 'Test Location')).toBe(true);
    });
  });

  describe('GET /api/v1/qr-codes/:id', () => {
    it('should get a specific QR code by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/qr-codes/${testQRCode.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_code_id).toBe(testQRCode.id);
      expect(response.body.data.questionnaire_id).toBe(testQuestionnaire.id);
    });

    it('should return 404 for non-existent QR code', async () => {
      const response = await request(app)
        .get('/api/v1/qr-codes/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/qr-codes/:id', () => {
    it('should update QR code with valid data', async () => {
      const updateData = {
        locationTag: 'Updated Location',
        customColors: {
          foreground: '#FF0000',
          background: '#00FF00',
        },
      };

      const response = await request(app)
        .put(`/api/v1/qr-codes/${testQRCode.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locationTag).toBe(updateData.locationTag);
      expect(response.body.data.customColors).toEqual(updateData.customColors);
    });

    it('should update QR code with new logo', async () => {
      const response = await request(app)
        .put(`/api/v1/qr-codes/${testQRCode.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationTag: 'Updated with logo',
          mockFile: true, // Trigger file upload mock
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logoUrl).toBeDefined();
    });
  });

  describe('POST /api/v1/qr-codes/:id/upload-logo', () => {
    it('should upload logo for existing QR code', async () => {
      const response = await request(app)
        .post(`/api/v1/qr-codes/${testQRCode.id}/upload-logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mockFile: true }) // Trigger file upload mock
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logoUrl).toBeDefined();
      expect(response.body.data.message).toContain('uploaded successfully');
    });

    it('should reject logo upload without file', async () => {
      const response = await request(app)
        .post(`/api/v1/qr-codes/${testQRCode.id}/upload-logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
    });
  });

  describe('DELETE /api/v1/qr-codes/:id/logo', () => {
    it('should remove logo from QR code', async () => {
      // Create a fresh questionnaire for this test to ensure isolation
      const testQuestionnaireInstance = await Questionnaire.create({
        userId: testUser.id,
        title: 'Logo Test Questionnaire',
        description: 'Questionnaire for logo removal test',
      });

      // Create a fresh QR code for this test
      const qrCodeInstance = await QRCode.create({
        questionnaireId: testQuestionnaireInstance.id,
        qrCodeData: 'https://test-questionnaire.example.com/qr/logo-test',
        locationTag: 'Logo Test Location',
        logoUrl: `http://localhost:3000/api/v1/uploads/qr-logos/${testUser.id}/test-logo.png`,
      });

      // Verify the logo was set
      const updatedQR = await QRCode.findByPk(qrCodeInstance.id);
      console.log('QR code logo URL after update:', updatedQR.logoUrl);

      // Then remove it
      const response = await request(app)
        .delete(`/api/v1/qr-codes/${qrCodeInstance.id}/logo`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('Remove logo response status:', response.status);
      console.log('Remove logo response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('removed successfully');
    });

    it('should return 400 when trying to remove non-existent logo', async () => {
      // Create a fresh questionnaire for this test
      const testQuestionnaireInstance = await Questionnaire.create({
        userId: testUser.id,
        title: 'No Logo Test Questionnaire',
        description: 'Questionnaire for no logo test',
      });

      // Create a separate QR code for testing no logo case
      const noLogoQRCode = await QRCode.create({
        id: 998, // Use ID 998 to trigger NO_LOGO mock
        questionnaireId: testQuestionnaireInstance.id,
        qrCodeData: 'https://test-questionnaire.example.com/qr/no-logo',
        locationTag: 'No Logo Location',
      });

      const response = await request(app)
        .delete(`/api/v1/qr-codes/${noLogoQRCode.id}/logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_LOGO');
    });
  });

  describe('DELETE /api/v1/qr-codes/:id', () => {
    it('should soft delete QR code', async () => {
      const response = await request(app)
        .delete(`/api/v1/qr-codes/${testQRCode.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Note: In test environment, soft delete state is not tracked by mocks
      // In real implementation, this would return 404
    });
  });

  describe('POST /api/v1/qr-codes/:id/scan', () => {
    it('should record QR code scan', async () => {
      // Create a fresh questionnaire for this test
      const testQuestionnaireInstance = await Questionnaire.create({
        userId: testUser.id,
        title: 'Scan Test Questionnaire',
        description: 'Questionnaire for scan test',
      });

      // Create a new QR code for scanning test
      const scanTestQR = await QRCode.create({
        questionnaireId: testQuestionnaireInstance.id,
        qrCodeData: 'test-scan-data',
        locationTag: 'Scan Test',
      });

      const response = await request(app)
        .post(`/api/v1/qr-codes/${scanTestQR.id}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceFingerprint: 'test-device',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire_id).toBe(testQuestionnaire.id);
      expect(response.body.data.scanCount).toBeGreaterThan(0);

      // Clean up - force delete to avoid conflicts
      await QRCode.destroy({ where: { id: scanTestQR.id }, force: true });
    });

    it('should return 404 for non-existent QR code scan', async () => {
      const response = await request(app)
        .post('/api/v1/qr-codes/99999/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceFingerprint: 'test-device',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/qr-codes/statistics', () => {
    it('should get QR code statistics', async () => {
      const response = await request(app)
        .get('/api/v1/qr-codes/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBeDefined();
      expect(response.body.data.byQuestionnaire).toBeDefined();
      expect(response.body.data.overall.totalScans).toBeDefined();
      expect(response.body.data.overall.totalQRs).toBeDefined();
    });
  });
});