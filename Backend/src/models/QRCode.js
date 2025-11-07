'use strict';

const { DataTypes, Op } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * QR Code model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} QR Code model
 */
module.exports = (sequelize) => {
  const QRCode = sequelize.define(
    'QRCode',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the QR code',
      },
      questionnaireId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'questionnaire_id',
        comment: 'Foreign key to questionnaires table',
      },
      qrCodeData: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'qr_code_data',
        comment: 'Encoded QR code data (URL or identifier)',
      },
      qrCodeImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'qr_code_image',
        comment: 'Path to generated QR code image file',
      },
      locationTag: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'location_tag',
        validate: {
          len: [0, 255],
        },
        comment: 'Physical location or placement identifier',
      },
      logoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'logo_url',
        comment: 'URL to custom logo embedded in QR code',
      },
      customColors: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'custom_colors',
        comment: 'Custom color scheme for QR code',
      },
      size: {
        type: getDataType('INTEGER'),
        allowNull: false,
        defaultValue: 200,
        validate: {
          min: 50,
          max: 1000,
        },
        comment: 'QR code image size in pixels',
      },
      errorCorrectionLevel: {
        type: DataTypes.ENUM('L', 'M', 'Q', 'H'),
        allowNull: false,
        defaultValue: 'M',
        field: 'error_correction_level',
        comment: 'Error correction level for QR code',
      },
      scanCount: {
        type: getDataType('BIGINT'),
        allowNull: false,
        defaultValue: 0,
        field: 'scan_count',
        comment: 'Total number of times this QR code has been scanned',
      },
      uniqueScans: {
        type: getDataType('BIGINT'),
        allowNull: false,
        defaultValue: 0,
        field: 'unique_scans',
        comment: 'Number of unique scans (by device/IP)',
      },
      lastScanAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_scan_at',
        comment: 'Timestamp of the last scan',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Whether this QR code is currently active',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
        comment: 'Expiration date for the QR code (null for no expiration)',
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional QR code settings',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the QR code was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the QR code was last updated',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    },
    {
      tableName: 'qr_codes',
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true, // Use snake_case for column names
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_qr_codes_questionnaire_id',
        },
        {
          fields: ['qr_code_data'],
          name: 'idx_qr_codes_data',
        },
        {
          fields: ['location_tag'],
          name: 'idx_qr_codes_location_tag',
        },
        {
          fields: ['scan_count'],
          name: 'idx_qr_codes_scan_count',
        },
        {
          fields: ['unique_scans'],
          name: 'idx_qr_codes_unique_scans',
        },
        {
          fields: ['is_active'],
          name: 'idx_qr_codes_is_active',
        },
        {
          fields: ['expires_at'],
          name: 'idx_qr_codes_expires_at',
        },
        {
          fields: ['last_scan_at'],
          name: 'idx_qr_codes_last_scan_at',
        },
        {
          fields: ['created_at'],
          name: 'idx_qr_codes_created_at',
        },
        {
          fields: ['deleted_at'],
          name: 'idx_qr_codes_deleted_at',
        },
        {
          fields: ['questionnaire_id', 'is_active', 'deleted_at'],
          name: 'idx_qr_codes_active_in_questionnaire',
        },
        {
          fields: ['location_tag', 'is_active'],
          name: 'idx_qr_codes_location_active',
        },
      ],
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  QRCode.associate = function (models) {
    // Association with Questionnaire (many-to-one)
    QRCode.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get QR code summary for API responses
   * @returns {Object} QR code summary object
   */
  QRCode.prototype.toSummaryJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      qrCodeData: this.qrCodeData,
      qrCodeImage: this.qrCodeImage,
      locationTag: this.locationTag,
      logoUrl: this.logoUrl,
      customColors: this.customColors,
      size: this.size,
      errorCorrectionLevel: this.errorCorrectionLevel,
      scanCount: this.scanCount,
      uniqueScans: this.uniqueScans,
      lastScanAt: this.lastScanAt,
      isActive: this.isActive,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Check if QR code is expired
   * @returns {boolean} True if expired
   */
  QRCode.prototype.isExpired = function () {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > new Date(this.expiresAt);
  };

  /**
   * Check if QR code is currently valid (active and not expired)
   * @returns {boolean} True if valid
   */
  QRCode.prototype.isValid = function () {
    return this.isActive && !this.isExpired();
  };

  /**
   * Increment scan count
   * @param {boolean} isUnique - Whether this is a unique scan
   * @returns {Promise<void>}
   */
  QRCode.prototype.incrementScan = async function (isUnique = false) {
    this.scanCount += 1;
    if (isUnique) {
      this.uniqueScans += 1;
    }
    this.lastScanAt = new Date();
    await this.save();
  };

  /**
   * Class methods
   */

  /**
   * Find QR codes by questionnaire with filtering
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Object} options - Query options
   * @returns {Array} Filtered QR codes
   */
  QRCode.findByQuestionnaire = async function (questionnaireId, options = {}) {
    const { includeInactive = false, locationTag = null, onlyValid = false } = options;

    const whereClause = { questionnaireId };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (locationTag) {
      whereClause.locationTag = locationTag;
    }

    const qrCodes = await this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    if (onlyValid) {
      return qrCodes.filter((qrCode) => qrCode.isValid());
    }

    return qrCodes;
  };

  /**
   * Find QR codes by location
   * @param {string} locationTag - Location tag
   * @param {Object} options - Query options
   * @returns {Array} QR codes at location
   */
  QRCode.findByLocation = function (locationTag, options = {}) {
    const { includeInactive = false } = options;

    const whereClause = { locationTag };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: require('./Questionnaire')(sequelize),
          as: 'questionnaire',
          attributes: ['id', 'title', 'isActive'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  };

  /**
   * Get scan statistics for QR codes
   * @param {number} questionnaireId - Questionnaire ID (optional)
   * @returns {Object} Scan statistics
   */
  QRCode.getScanStatistics = async function (questionnaireId = null) {
    const whereClause = {};
    if (questionnaireId) {
      whereClause.questionnaireId = questionnaireId;
    }

    const [totalScans, uniqueScans, totalQRs, activeQRs] = await Promise.all([
      this.sum('scanCount', { where: whereClause }),
      this.sum('uniqueScans', { where: whereClause }),
      this.count({ where: whereClause }),
      this.count({
        where: {
          ...whereClause,
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
          ],
        },
      }),
    ]);

    return {
      totalScans: totalScans || 0,
      uniqueScans: uniqueScans || 0,
      totalQRs,
      activeQRs,
      averageScansPerQR: totalQRs > 0 ? Math.round(totalScans / totalQRs) : 0,
    };
  };

  /**
   * Clean up expired QR codes
   * @returns {number} Number of cleaned up QR codes
   */
  QRCode.cleanupExpired = async function () {
    const expiredQRs = await this.findAll({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
        isActive: true,
      },
    });

    // Process all updates in parallel
    const updatePromises = expiredQRs.map(qr => {
      qr.isActive = false;
      return qr.save();
    });

    await Promise.all(updatePromises);
    return expiredQRs.length;
  };

  return QRCode;
};
