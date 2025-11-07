'use strict';

const express = require('express');
const router = express.Router();
const qrCodeController = require('../controllers/qrCodeController');
const AuthMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes except scan endpoint
router.use((req, res, next) => {
  if (req.path.endsWith('/scan')) {
    return next(); // Skip authentication for scan endpoint
  }
  return AuthMiddleware.authenticate(req, res, next);
});

/**
 * @swagger
 * components:
 *   schemas:
 *     QRCode:
 *       type: object
 *       required:
 *         - questionnaireId
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the QR code
 *         questionnaireId:
 *           type: integer
 *           description: ID of the linked questionnaire
 *         qrCodeData:
 *           type: string
 *           description: Encoded QR code data (URL)
 *         qrCodeImage:
 *           type: string
 *           description: Path to generated QR code image file
 *         locationTag:
 *           type: string
 *           maxLength: 255
 *           description: Physical location or placement identifier
 *         logoUrl:
 *           type: string
 *           description: URL to custom logo embedded in QR code
 *         customColors:
 *           type: object
 *           properties:
 *             foreground:
 *               type: string
 *               pattern: '^#[0-9A-Fa-f]{6}$'
 *             background:
 *               type: string
 *               pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Custom color scheme for QR code
 *         size:
 *           type: integer
 *           minimum: 50
 *           maximum: 1000
 *           default: 200
 *           description: QR code image size in pixels
 *         errorCorrectionLevel:
 *           type: string
 *           enum: [L, M, Q, H]
 *           default: M
 *           description: Error correction level for QR code
 *         scanCount:
 *           type: integer
 *           default: 0
 *           description: Total number of times this QR code has been scanned
 *         uniqueScans:
 *           type: integer
 *           default: 0
 *           description: Number of unique scans (by device/IP)
 *         lastScanAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last scan
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether this QR code is currently active
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Expiration date for the QR code
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the QR code was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the QR code was last updated
 *
 *     QRCodeListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             qrCodes:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QRCode'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */

/**
 * @swagger
 * /api/v1/qr-codes:
 *   get:
 *     summary: Get user's QR codes with filtering and pagination
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: questionnaireId
 *         schema:
 *           type: integer
 *         description: Filter by questionnaire ID
 *       - in: query
 *         name: locationTag
 *         schema:
 *           type: string
 *         description: Filter by location tag
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive QR codes
 *       - in: query
 *         name: onlyValid
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only include valid (active and not expired) QR codes
 *     responses:
 *       200:
 *         description: QR codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRCodeListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/', ...qrCodeController.getQRCodes);
router.get('/statistics', ...qrCodeController.getQRCodeStatistics);
router.get('/:id', ...qrCodeController.getQRCodeById);
// console.log('Registering POST / route for QR codes');
// console.log('qrCodeController.createQRCode:', qrCodeController.createQRCode);
router.post('/', (req, res, next) => {
  // console.log('POST / route called');
  next();
}, ...qrCodeController.createQRCode);
router.put('/:id', ...qrCodeController.updateQRCode);
router.delete('/:id', ...qrCodeController.deleteQRCode);
router.post('/:id/scan', ...qrCodeController.recordQRCodeScan);
router.post('/:id/upload-logo', ...qrCodeController.uploadQRCodeLogo);
router.delete('/:id/logo', ...qrCodeController.removeQRCodeLogo);

module.exports = router;
