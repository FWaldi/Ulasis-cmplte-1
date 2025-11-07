'use strict';

const bubbleAnalyticsService = require('./bubbleAnalyticsService');
const timeComparisonService = require('./timeComparisonService');
const logger = require('../utils/logger');

/**
 * Report Generation Service
 * Generates CSV and Excel reports for analytics data
 */

// Import ExcelJS if available, otherwise fallback to CSV only
let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (error) {
  logger.warn('ExcelJS not available, Excel export will be disabled');
}

/**
 * Generate analytics report
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Report generation options
 * @returns {Promise<Buffer|string>} Report data
 */
const generateAnalyticsReport = async (questionnaireId, options = {}) => {
  try {
    const {
      format = 'csv',
      dateFrom,
      dateTo,
      includeComparison = false,
      includeRawData = false,
      userId,
    } = options;

    logger.info(`Generating ${format.toUpperCase()} report for questionnaire ${questionnaireId}`, {
      userId,
      dateFrom,
      dateTo,
      includeComparison,
      includeRawData,
    });

    // Get analytics data
    const analytics = await bubbleAnalyticsService.getBubbleAnalytics(questionnaireId, {
      dateFrom,
      dateTo,
    });

    let comparisonData = null;
    if (includeComparison) {
      comparisonData = await timeComparisonService.getTimePeriodComparison(questionnaireId, {
        comparisonType: 'week_over_week',
      });
    }

    // Generate report based on format
    if (format === 'excel' && ExcelJS) {
      return await generateExcelReport(analytics, comparisonData, options);
    } else {
      return await generateCSVReport(analytics, comparisonData, options);
    }

  } catch (error) {
    logger.error(`Error generating analytics report for questionnaire ${questionnaireId}:`, error);
    throw error;
  }
};

/**
 * Generate CSV report
 * @param {Object} analytics - Analytics data
 * @param {Object} comparisonData - Comparison data (optional)
 * @param {Object} options - Report options
 * @returns {string} CSV content
 */
const generateCSVReport = (analytics, comparisonData) => {


  let csvContent = '';

  // Add header
  csvContent += 'Analytics Report\n';
  csvContent += `Questionnaire ID,${analytics.questionnaire_id}\n`;
  csvContent += `Generated,${new Date(analytics.generated_at).toLocaleString()}\n`;
  csvContent += `Period,${analytics.period_comparison.current_period}\n`;
  csvContent += `Total Responses,${analytics.total_responses}\n`;
  csvContent += `Response Rate,${(analytics.response_rate * 100).toFixed(1)}%\n\n`;

  // Category Analytics Section
  csvContent += 'Category Analytics\n';
  csvContent += 'Category,Rating,Response Count,Response Rate,Color,Trend\n';

  analytics.categories.forEach(category => {
    csvContent += `"${category.name}",${category.rating},${category.response_count},${(analytics.response_rate * 100).toFixed(1)}%,${category.color},${category.trend}\n`;
  });

  // Comparison Data Section
  if (comparisonData) {
    csvContent += '\nPeriod Comparison\n';
    csvContent += 'Metric,Current Period,Previous Period,Change,Percentage Change,Trend\n';

    const metrics = comparisonData.comparison_metrics;
    csvContent += `Total Responses,${metrics.response_count_change.current},${metrics.response_count_change.previous},${metrics.response_count_change.change},${metrics.response_count_change.percentage_change}%,${metrics.response_count_change.trend}\n`;
    csvContent += `Overall Rating,${metrics.overall_rating_change.current},${metrics.overall_rating_change.previous},${metrics.overall_rating_change.change},${metrics.overall_rating_change.percentage_change}%,${metrics.overall_rating_change.trend}\n`;

    // Category comparisons
    csvContent += '\nCategory Comparisons\n';
    csvContent += 'Category,Current Rating,Previous Rating,Rating Change,Rating Trend,Current Responses,Previous Responses,Response Trend\n';

    metrics.category_comparisons.forEach(comp => {
      csvContent += `"${comp.name}",${comp.current_rating},${comp.previous_rating},${comp.rating_change},${comp.rating_trend},${comp.current_responses},${comp.previous_responses},${comp.response_trend}\n`;
    });

    // Insights
    if (metrics.insights && metrics.insights.length > 0) {
      csvContent += '\nInsights\n';
      csvContent += 'Type,Message\n';
      metrics.insights.forEach(insight => {
        csvContent += `${insight.type},"${insight.message}"\n`;
      });
    }
  }

  // Summary Statistics
  csvContent += '\nSummary Statistics\n';
  csvContent += 'Metric,Value\n';

  const colorDistribution = {
    red: analytics.categories.filter(cat => cat.color === 'red').length,
    yellow: analytics.categories.filter(cat => cat.color === 'yellow').length,
    green: analytics.categories.filter(cat => cat.color === 'green').length,
  };

  csvContent += `Total Categories,${analytics.categories.length}\n`;
  csvContent += `Red Categories (Poor),${colorDistribution.red}\n`;
  csvContent += `Yellow Categories (Average),${colorDistribution.yellow}\n`;
  csvContent += `Green Categories (Excellent),${colorDistribution.green}\n`;
  csvContent += `Overall Trend,${analytics.period_comparison.overall_trend}\n`;

  return csvContent;
};

/**
 * Generate Excel report
 * @param {Object} analytics - Analytics data
 * @param {Object} comparisonData - Comparison data (optional)
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} Excel file buffer
 */
const generateExcelReport = async (analytics, comparisonData, _options) => {
  if (!ExcelJS) {
    throw new Error('ExcelJS is required for Excel export');
  }

  const workbook = new ExcelJS.Workbook();

  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  createSummarySheet(summarySheet, analytics, comparisonData);

  // Create category analytics sheet
  const categorySheet = workbook.addWorksheet('Category Analytics');
  createCategorySheet(categorySheet, analytics);

  // Create comparison sheet if data available
  if (comparisonData) {
    const comparisonSheet = workbook.addWorksheet('Period Comparison');
    createComparisonSheet(comparisonSheet, comparisonData);
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Create summary worksheet
 * @param {ExcelJS.Worksheet} sheet - Excel worksheet
 * @param {Object} analytics - Analytics data
 * @param {Object} comparisonData - Comparison data
 */
const createSummarySheet = (sheet, analytics, _comparisonData) => {
  // Title
  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = 'Analytics Report Summary';
  sheet.getCell('A1').font = { bold: true, size: 16 };

  // Basic info
  sheet.getCell('A3').value = 'Questionnaire ID:';
  sheet.getCell('B3').value = analytics.questionnaire_id;

  sheet.getCell('A4').value = 'Generated:';
  sheet.getCell('B4').value = new Date(analytics.generated_at).toLocaleString();

  sheet.getCell('A5').value = 'Period:';
  sheet.getCell('B5').value = analytics.period_comparison.current_period;

  sheet.getCell('A6').value = 'Total Responses:';
  sheet.getCell('B6').value = analytics.total_responses;

  sheet.getCell('A7').value = 'Response Rate:';
  sheet.getCell('B7').value = `${(analytics.response_rate * 100).toFixed(1)}%`;

  // Color distribution
  const colorDistribution = {
    red: analytics.categories.filter(cat => cat.color === 'red').length,
    yellow: analytics.categories.filter(cat => cat.color === 'yellow').length,
    green: analytics.categories.filter(cat => cat.color === 'green').length,
  };

  sheet.getCell('A9').value = 'Color Distribution';
  sheet.getCell('A9').font = { bold: true };

  sheet.getCell('A10').value = 'Red (Poor):';
  sheet.getCell('B10').value = colorDistribution.red;
  sheet.getCell('B10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };

  sheet.getCell('A11').value = 'Yellow (Average):';
  sheet.getCell('B11').value = colorDistribution.yellow;
  sheet.getCell('B11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };

  sheet.getCell('A12').value = 'Green (Excellent):';
  sheet.getCell('B12').value = colorDistribution.green;
  sheet.getCell('B12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };

  // Overall trend
  sheet.getCell('A14').value = 'Overall Trend:';
  sheet.getCell('B14').value = analytics.period_comparison.overall_trend;

  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 20;
  });
};

/**
 * Create category analytics worksheet
 * @param {ExcelJS.Worksheet} sheet - Excel worksheet
 * @param {Object} analytics - Analytics data
 */
const createCategorySheet = (sheet, analytics) => {
  // Headers
  sheet.getCell('A1').value = 'Category';
  sheet.getCell('B1').value = 'Rating';
  sheet.getCell('C1').value = 'Response Count';
  sheet.getCell('D1').value = 'Color';
  sheet.getCell('E1').value = 'Trend';

  // Style headers
  ['A1', 'B1', 'C1', 'D1', 'E1'].forEach(cell => {
    sheet.getCell(cell).font = { bold: true };
    sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Data
  let row = 2;
  analytics.categories.forEach(category => {
    sheet.getCell(`A${row}`).value = category.name;
    sheet.getCell(`B${row}`).value = category.rating;
    sheet.getCell(`C${row}`).value = category.response_count;
    sheet.getCell(`D${row}`).value = category.color;
    sheet.getCell(`E${row}`).value = category.trend;

    // Apply color coding
    let fillColor;
    switch (category.color) {
      case 'red':
        fillColor = 'FFFFCCCC';
        break;
      case 'yellow':
        fillColor = 'FFFFFFCC';
        break;
      case 'green':
        fillColor = 'FFCCFFCC';
        break;
    }

    if (fillColor) {
      sheet.getCell(`D${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    }

    row++;
  });

  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 15;
  });
};

/**
 * Create comparison worksheet
 * @param {ExcelJS.Worksheet} sheet - Excel worksheet
 * @param {Object} comparisonData - Comparison data
 */
const createComparisonSheet = (sheet, comparisonData) => {
  // Title
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'Period Comparison Analysis';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  // Period info
  sheet.getCell('A3').value = 'Current Period:';
  sheet.getCell('B3').value = `${comparisonData.current_period.start} to ${comparisonData.current_period.end}`;

  sheet.getCell('A4').value = 'Previous Period:';
  sheet.getCell('B4').value = `${comparisonData.previous_period.start} to ${comparisonData.previous_period.end}`;

  // Metrics comparison
  sheet.getCell('A6').value = 'Metrics Comparison';
  sheet.getCell('A6').font = { bold: true };

  const metrics = comparisonData.comparison_metrics;

  // Headers
  sheet.getCell('A7').value = 'Metric';
  sheet.getCell('B7').value = 'Current';
  sheet.getCell('C7').value = 'Previous';
  sheet.getCell('D7').value = 'Change';
  sheet.getCell('E7').value = '% Change';
  sheet.getCell('F7').value = 'Trend';

  ['A7', 'B7', 'C7', 'D7', 'E7', 'F7'].forEach(cell => {
    sheet.getCell(cell).font = { bold: true };
    sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Response count data
  sheet.getCell('A8').value = 'Total Responses';
  sheet.getCell('B8').value = metrics.response_count_change.current;
  sheet.getCell('C8').value = metrics.response_count_change.previous;
  sheet.getCell('D8').value = metrics.response_count_change.change;
  sheet.getCell('E8').value = `${metrics.response_count_change.percentage_change}%`;
  sheet.getCell('F8').value = metrics.response_count_change.trend;

  // Overall rating data
  sheet.getCell('A9').value = 'Overall Rating';
  sheet.getCell('B9').value = metrics.overall_rating_change.current;
  sheet.getCell('C9').value = metrics.overall_rating_change.previous;
  sheet.getCell('D9').value = metrics.overall_rating_change.change;
  sheet.getCell('E9').value = `${metrics.overall_rating_change.percentage_change}%`;
  sheet.getCell('F9').value = metrics.overall_rating_change.trend;

  // Category comparisons
  let row = 11;
  sheet.getCell(`A${row}`).value = 'Category Comparisons';
  sheet.getCell(`A${row}`).font = { bold: true };
  row++;

  // Category headers
  sheet.getCell(`A${row}`).value = 'Category';
  sheet.getCell(`B${row}`).value = 'Current Rating';
  sheet.getCell(`C${row}`).value = 'Previous Rating';
  sheet.getCell(`D${row}`).value = 'Rating Change';
  sheet.getCell(`E${row}`).value = 'Rating Trend';
  sheet.getCell(`F${row}`).value = 'Current Responses';
  sheet.getCell(`G${row}`).value = 'Previous Responses';
  sheet.getCell(`H${row}`).value = 'Response Trend';

  for (let col = 0; col < 8; col++) {
    const cell = String.fromCharCode(65 + col) + row;
    sheet.getCell(cell).font = { bold: true };
    sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  }
  row++;

  // Category data
  metrics.category_comparisons.forEach(comp => {
    sheet.getCell(`A${row}`).value = comp.name;
    sheet.getCell(`B${row}`).value = comp.current_rating;
    sheet.getCell(`C${row}`).value = comp.previous_rating;
    sheet.getCell(`D${row}`).value = comp.rating_change;
    sheet.getCell(`E${row}`).value = comp.rating_trend;
    sheet.getCell(`F${row}`).value = comp.current_responses;
    sheet.getCell(`G${row}`).value = comp.previous_responses;
    sheet.getCell(`H${row}`).value = comp.response_trend;
    row++;
  });

  // Insights
  if (metrics.insights && metrics.insights.length > 0) {
    row += 2;
    sheet.getCell(`A${row}`).value = 'Insights';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;

    sheet.getCell(`A${row}`).value = 'Type';
    sheet.getCell(`B${row}`).value = 'Message';
    ['A', 'B'].forEach(col => {
      sheet.getCell(`${col}${row}`).font = { bold: true };
      sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    metrics.insights.forEach(insight => {
      sheet.getCell(`A${row}`).value = insight.type;
      sheet.getCell(`B${row}`).value = insight.message;
      row++;
    });
  }

  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 18;
  });
};

/**
 * Validate export permissions based on subscription
 * @param {string} format - Export format
 * @param {string} subscriptionPlan - User's subscription plan
 * @returns {Object} Validation result
 */
const validateExportPermissions = (format, subscriptionPlan) => {
  if (subscriptionPlan === 'free') {
    return {
      allowed: false,
      error: 'SUBSCRIPTION_ERROR_001',
      message: 'Export functionality not available for Free plan',
    };
  }

  if (format === 'excel' && subscriptionPlan !== 'business') {
    return {
      allowed: false,
      error: 'SUBSCRIPTION_ERROR_002',
      message: 'Excel export requires Business plan',
    };
  }

  return { allowed: true };
};

module.exports = {
  generateAnalyticsReport,
  generateCSVReport,
  generateExcelReport,
  validateExportPermissions,
};