// Simplified models mock using factory functions
// Global variable to store Answer mock data
let answerMockData = null;

const {
  createMockQuestionnaire,
  createMockResponse,
  createMockPaymentTransaction,
  createMockNotificationPreference,
  mockQRCodes,
  mockDeletedQuestionnaires,
  mockQuestionnaires,
  mockUserUsageCounts,
  createMockQuestion,
  createMockQRCode,
  createMockAnswer,
  createMockNotificationHistory,
  createMockAuditLog,
  createMockSubscriptionUsage,
} = require('./modelMocks');

const { createMockUser } = require('./user');

// Get reference to the model mocks module to access mutable variables
const modelMocks = require('./modelMocks');

const { User } = require('./user');

const mockQuestion = createMockQuestion();

// Counter for generating unique question IDs
let questionNextId = 1;

// Track created questions for proper test isolation
const createdQuestions = new Map();

// Track deleted questions for proper test isolation
const deletedQuestions = new Set();

// Reset function for test isolation
function resetQuestionMockState() {
  createdQuestions.clear();
  deletedQuestions.clear();
  mockDeletedQuestionnaires.clear();
  questionNextId = 1;
}

module.exports = {
  User,
  deletedQuestions,
  createdQuestions,
  resetQuestionMockState,
  Question: {
    create: jest.fn().mockImplementation((data) => {
      // Generate unique ID for each question
      const questionId = questionNextId++;

      const question = createMockQuestion({ ...data, id: questionId });
      if (data.options) {
        question.options = data.options;
      }

      // Store created question for retrieval
      createdQuestions.set(questionId, question);

      // Add instance methods to the question object
      question.destroy = jest.fn().mockImplementation(async () => {
        deletedQuestions.add(questionId);
        return Promise.resolve();
      });

      return Promise.resolve(question);
    }),
    bulkCreate: jest.fn().mockImplementation((dataArray) => {
      return Promise.resolve(dataArray.map((data, index) => createMockQuestion({ ...data, id: index + 1 })));
    }),
    findByPk: jest.fn().mockImplementation((id, options = {}) => {
      // Convert string IDs to numbers for consistent lookup
      const numericId = parseInt(id);

      if (deletedQuestions.has(numericId)) {
        return Promise.resolve(null);
      }

      const question = createdQuestions.get(numericId);
      if (question) {
        // Handle include options
        if (options.include) {
          const questionWithIncludes = { ...question };

          if (Array.isArray(options.include)) {
            options.include.forEach(include => {
              if (include.as === 'questionnaire') {
                // Find the questionnaire for this question
                const questionnaireId = question.questionnaireId;
                const questionnaire = mockQuestionnaires.get(questionnaireId.toString());
                questionWithIncludes.questionnaire = questionnaire || null;
              }
              if (include.as === 'answers') {
                // For now, return empty answers array
                questionWithIncludes.answers = [];
              }
            });
          }

          return Promise.resolve(questionWithIncludes);
        }

        return Promise.resolve(question);
      }

      // Fallback to default mock
      const fallbackQuestion = createMockQuestion({ id: numericId });
      return Promise.resolve(fallbackQuestion);
    }),
    findOne: jest.fn().mockResolvedValue(mockQuestion),
    findAll: jest.fn().mockImplementation((options = {}) => {
      // Return questions with different categories to support analytics tests
      const questions = [
        createMockQuestion({ id: 1, category: 'service', questionnaireId: 1 }),
        createMockQuestion({ id: 2, category: 'product', questionnaireId: 1 }),
      ];

      // Apply filters if provided
      if (options.where && options.where.questionnaireId) {
        return Promise.resolve(questions.filter(q => q.questionnaireId === options.where.questionnaireId));
      }

      return Promise.resolve(questions);
    }),
    destroy: jest.fn().mockImplementation((options) => {
      // Track deletion for proper test isolation
      if (options && options.where && options.where.id) {
        const questionId = parseInt(options.where.id);
        deletedQuestions.add(questionId);
        return Promise.resolve(1);
      }
      return Promise.resolve(1);
    }),
    update: jest.fn().mockResolvedValue([1]),
    count: jest.fn().mockResolvedValue(1),
    findByQuestionnaireOrdered: jest.fn().mockImplementation((questionnaireId, options = {}) => {
      const questions = Array.from(createdQuestions.values()).filter(q => {
        const matches = q.questionnaireId == questionnaireId;
        const notDeleted = !deletedQuestions.has(q.id);
        return matches && notDeleted;
      });

      // Sort by orderIndex
      questions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      return Promise.resolve(questions);
    }),
    getNextOrderIndex: jest.fn().mockResolvedValue(1),
    reorderQuestions: jest.fn().mockImplementation(async (questionnaireId, questionOrders) => {
      const updatedQuestions = [];
      for (const item of questionOrders) {
        const question = createMockQuestion({ id: item.question_id, orderIndex: item.order_index });
        updatedQuestions.push(question);
      }
      return updatedQuestions;
    }),
    getStatistics: jest.fn().mockResolvedValue({
      total_questions: 1,
      questions_by_type: { text: 1 },
      questions_by_category: { test: 1 },
      average_questions_per_questionnaire: 1,
    }),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  QRCode: {
    create: jest.fn().mockImplementation((data) => {
      const qrCode = createMockQRCode(data);
      // Store with both string and number keys for robust lookup
      mockQRCodes.set(qrCode.id, qrCode);
      mockQRCodes.set(String(qrCode.id), qrCode);
      return Promise.resolve(qrCode);
    }),
    findByPk: jest.fn().mockImplementation((id, options = {}) => {
      if (id === 99999 || id === '99999') return Promise.resolve(null);

      if (mockQRCodes.has(id) || mockQRCodes.has(String(id))) {
        const qrCode = mockQRCodes.get(id) || mockQRCodes.get(String(id));
        if (qrCode && qrCode.deletedAt) {
          return Promise.resolve(null);
        }

        // Handle includes - if questionnaire is included, ensure it's present
        if (options.include && Array.isArray(options.include)) {
          const hasQuestionnaireInclude = options.include.some(inc =>
            inc.model && inc.model.name === 'Questionnaire' || inc.as === 'questionnaire',
          );

          if (hasQuestionnaireInclude && !qrCode.questionnaire) {
            qrCode.questionnaire = {
              id: qrCode.questionnaireId,
              userId: 1, // Default user ID for tests
              title: 'Test Questionnaire',
            };
          }
        }

        return Promise.resolve(qrCode);
      }

      const newQRCode = createMockQRCode({ id: parseInt(id) });

      // Handle includes for newly created QR codes
      if (options.include && Array.isArray(options.include)) {
        const hasQuestionnaireInclude = options.include.some(inc =>
          inc.model && inc.model.name === 'Questionnaire' || inc.as === 'questionnaire',
        );

        if (hasQuestionnaireInclude) {
          newQRCode.questionnaire = {
            id: newQRCode.questionnaireId,
            userId: 1, // Default user ID for tests
            title: 'Test Questionnaire',
          };
        }
      }

      return Promise.resolve(newQRCode);
    }),
    findAll: jest.fn().mockResolvedValue([createMockQRCode()]),
    findByQuestionnaire: jest.fn().mockResolvedValue([createMockQRCode()]),
    getScanStatistics: jest.fn().mockResolvedValue({
      totalScans: 0,
      uniqueScans: 0,
      averageScansPerQR: 0,
      totalQRs: 1,
    }),
    destroy: jest.fn().mockResolvedValue(1),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  Questionnaire: {
    create: jest.fn().mockImplementation((data) => {
      const questionnaire = createMockQuestionnaire(data);
      // Store the created questionnaire for later retrieval
      mockQuestionnaires.set(questionnaire.id.toString(), questionnaire);
      return Promise.resolve(questionnaire);
    }),
    findByPk: jest.fn().mockImplementation((id, options = {}) => {
      // Convert id to string for consistent key lookup
      const idKey = id.toString();


      if (id == 99999) return Promise.resolve(null);
      if (mockDeletedQuestionnaires.has(idKey)) return Promise.resolve(null);

      // Check if questionnaire exists in storage first
      if (mockQuestionnaires.has(idKey)) {
        const questionnaire = mockQuestionnaires.get(idKey);


        if (questionnaire.deletedAt) {
          console.log('🔧 Questionnaire was deleted, returning null');
          return Promise.resolve(null);
        }

        // Handle include options
        if (options.include) {
          if (Array.isArray(options.include)) {
            options.include.forEach(include => {
              if (include.model && include.model.name === 'Question') {
                questionnaire.questions = [createMockQuestion({ questionnaireId: parseInt(id) })];
              }
              if (include.model && include.model.name === 'QRCode') {
                questionnaire.qrCodes = [createMockQRCode({ questionnaireId: parseInt(id) })];
              }
            });
          }
        }

        return Promise.resolve(questionnaire);
      }

      // Fallback to default mock if not found in storage
      console.log('🔧 Questionnaire not found in storage, using fallback mock');
      const questionnaire = createMockQuestionnaire({ id: parseInt(id) });

      // Handle include options
      if (options.include) {
        if (Array.isArray(options.include)) {
          options.include.forEach(include => {
            if (include.model && include.model.name === 'Question') {
              questionnaire.questions = [createMockQuestion({ questionnaireId: parseInt(id) })];
            }
            if (include.model && include.model.name === 'QRCode') {
              questionnaire.qrCodes = [createMockQRCode({ questionnaireId: parseInt(id) })];
            }
          });
        }
      }

      console.log('🔧 Returning fallback questionnaire');
      return Promise.resolve(questionnaire);
    }),
    findOne: jest.fn().mockImplementation(async (options = {}) => {
      if (options.where && options.where.id) {
        // Duplicate findByPk logic to avoid scope issues
        const idKey = options.where.id.toString();

        if (options.where.id == 99999) return Promise.resolve(null);
        if (mockDeletedQuestionnaires.has(idKey)) return Promise.resolve(null);

        // Check if questionnaire exists in storage first
        if (mockQuestionnaires.has(idKey)) {
          const questionnaire = mockQuestionnaires.get(idKey);
          if (questionnaire.deletedAt) {
            return Promise.resolve(null);
          }

          // Handle include options
          if (options.include) {
            if (Array.isArray(options.include)) {
              options.include.forEach(include => {
                if (include.model && include.model.name === 'Question') {
                  questionnaire.questions = [createMockQuestion({ questionnaireId: parseInt(options.where.id) })];
                }
                if (include.model && include.model.name === 'QRCode') {
                  questionnaire.qrCodes = [createMockQRCode({ questionnaireId: parseInt(options.where.id) })];
                }
              });
            }
          }

          return Promise.resolve(questionnaire);
        }

        // Fallback to default mock if not found in storage
        const questionnaire = createMockQuestionnaire({ id: parseInt(options.where.id) });
        return Promise.resolve(questionnaire);
      }
      return Promise.resolve(createMockQuestionnaire());
    }),
    findAll: jest.fn().mockImplementation((options = {}) => {
      const questionnaires = [createMockQuestionnaire({ userId: 1 })];

      // Apply filters if provided
      let filteredQuestionnaires = questionnaires;

      if (options.where && options.where.userId) {
        filteredQuestionnaires = filteredQuestionnaires.filter(q => q.userId === options.where.userId);
      }

      return Promise.resolve(filteredQuestionnaires);
    }),
    destroy: jest.fn().mockImplementation((options) => {
      // Implement soft delete
      if (options && options.where && options.where.id) {
        // Specific deletion by ID - track for test purposes
        const id = options.where.id;

        // Check if questionnaire exists before deleting
        if (id === 99999) {
          return Promise.resolve(0); // No rows affected
        }

        mockDeletedQuestionnaires.add(id.toString());

        // Also remove from storage if present
        if (mockQuestionnaires.has(id.toString())) {
          const questionnaire = mockQuestionnaires.get(id.toString());
          questionnaire.deletedAt = new Date();
        }

        return Promise.resolve(1); // One row affected
      }

      // Bulk cleanup (where: {}) - don't track as individual deletions
      // This is used by global beforeEach for test isolation
      return Promise.resolve(1); // Return success for bulk operations
    }),
    update: jest.fn().mockImplementation((data, options) => {
      // For update operations, return [affectedCount, updatedRows]
      const questionnaireId = options?.where?.id || 1;
      const questionnaire = createMockQuestionnaire({ ...data, id: questionnaireId });
      return Promise.resolve([1, [questionnaire]]);
    }),
    findByUserPaginated: jest.fn().mockImplementation((userId, options = {}) => {
      const questionnaires = [createMockQuestionnaire({ userId })];
      return Promise.resolve({
        questionnaires,
        pagination: { page: options.page || 1, limit: options.limit || 10, total: 1, totalPages: 1 },
      });
    }),
    count: jest.fn().mockImplementation(() => {
      return Promise.resolve(modelMocks.mockQuestionnaireCreationCount);
    }),
    checkUserQuota: jest.fn().mockImplementation((userId, plan) => {
      if (plan === 'starter') {
        modelMocks.mockQuestionnaireCreationCount++;
        if (modelMocks.mockQuestionnaireCreationCount > 5) {
          return Promise.resolve({ canCreate: false, used: 5, limit: 5, plan: 'starter' });
        }
        return Promise.resolve({ canCreate: true, used: modelMocks.mockQuestionnaireCreationCount - 1, limit: 5, plan: 'starter' });
      }
      if (userId === 1 && plan === 'free') {
        modelMocks.mockQuestionnaireCreationCount++;
        if (modelMocks.mockQuestionnaireCreationCount > 5) {
          return Promise.resolve({ canCreate: false, used: 5, limit: 5, plan: 'free' });
        }
        return Promise.resolve({ canCreate: true, used: modelMocks.mockQuestionnaireCreationCount - 1, limit: 5, plan: 'free' });
      }
      return Promise.resolve({ canCreate: true, used: 0, limit: 10, plan });
    }),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getStatistics: jest.fn().mockResolvedValue({
      totalResponses: 0,
      averageCompletionTime: 0,
      completionRate: 0,
    }),
  },
  Response: {
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockResponse(data));
    }),
    bulkCreate: jest.fn().mockImplementation((dataArray) => {
      return Promise.resolve(dataArray.map((data, index) => ({ id: index + 1, ...data })));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockResponse({
        id: parseInt(id),
        questionnaireId: 1,
        responseDate: new Date(),
        answers: [],
      }));
    }),
    findOne: jest.fn().mockResolvedValue(createMockResponse({
      questionnaireId: 1,
      responseDate: new Date(),
      deviceFingerprint: 'test-device',
      ipAddress: '127.0.0.1',
      answers: [],
    })),
    findAll: jest.fn().mockResolvedValue([createMockResponse({
      questionnaireId: 1,
      responseDate: new Date(),
      deviceFingerprint: 'test-device',
      ipAddress: '127.0.0.1',
      answers: [],
    })]),
    count: jest.fn().mockResolvedValue(0),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    getStatistics: jest.fn().mockResolvedValue({
      totalResponses: 0,
      averageCompletionTime: 0,
      completionRate: 0,
    }),
    findByQuestionnairePaginated: jest.fn().mockImplementation((questionnaireId, options = {}) => {
      return Promise.resolve({
        responses: [],
        pagination: {
          page: options.page || 1,
          limit: options.limit || 10,
          total: 0,
          totalPages: 0,
        },
      });
    }),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  Answer: {
    build: jest.fn().mockImplementation((data) => {
      return createMockAnswer(data);
    }),
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockAnswer(data));
    }),
    bulkCreate: jest.fn().mockImplementation((dataArray) => {
      return Promise.resolve(dataArray.map((data, index) => ({ id: index + 1, ...data })));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockAnswer({
        id: parseInt(id),
        responseId: 1,
        questionId: 1,
        answerValue: 'test',
        ratingScore: 4,
        createdAt: new Date(),
      }));
    }),
    findOne: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockImplementation((options = {}) => {
      // Return dynamic mock data based on test setup
      // This allows tests to control what data is returned

      // If test has set up custom mock data via _setMockData, use that
      if (answerMockData) {
        let filteredData = answerMockData;

        // Apply filtering if where clause is provided
        if (options.where) {
          filteredData = answerMockData.filter(answer => {
            // Check questionId filter
            if (options.where.questionId && answer.questionId !== options.where.questionId) {
              return false;
            }

            // Check isSkipped filter
            if (options.where.isSkipped !== undefined && answer.isSkipped !== options.where.isSkipped) {
              return false;
            }

            // Check validationStatus filter
            if (options.where.validationStatus && answer.validationStatus !== options.where.validationStatus) {
              return false;
            }

            return true;
          });
        }

        return Promise.resolve(filteredData);
      }

      // Otherwise return empty array to force tests to set up their own data
      return Promise.resolve([]);
    }),
    count: jest.fn().mockResolvedValue(0),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    getStatistics: jest.fn().mockResolvedValue({
      totalAnswers: 0,
      uniqueAnswers: 0,
      averageValue: 0,
    }),
    getBatchStatistics: jest.fn().mockResolvedValue({
      totalAnswers: 0,
      uniqueAnswers: 0,
      averageValue: 0,
      answersByQuestion: {},
      answersByQuestionnaire: {},
    }),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    // Helper method for tests to set custom mock data
    _mockData: null,
    _setMockData(data) {
      answerMockData = data;
      this._mockData = data;
    },
    _clearMockData() {
      answerMockData = null;
      this._mockData = null;
    },
  },
  SubscriptionUsage: {
    create: jest.fn().mockImplementation((data) => {
      if (data.usage_type === 'questionnaires') {
        const userId = data.user_id;
        if (userId && mockUserUsageCounts.has(userId)) {
          mockUserUsageCounts.set(userId, data.current_count || 0);
        }
      }
      return Promise.resolve(createMockSubscriptionUsage(data));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockSubscriptionUsage({
        id: parseInt(id),
        user_id: 1,
        usage_type: 'questionnaires',
        current_count: 0,
        limit_count: 1,
      }));
    }),
    findOne: jest.fn().mockImplementation((options) => {
      const userId = options.where.user_id;
      const usageType = options.where.usage_type;

      let currentCount = 0;
      if (usageType === 'questionnaires') {
        if (!mockUserUsageCounts.has(userId)) {
          mockUserUsageCounts.set(userId, 0);
        }
        currentCount = mockUserUsageCounts.get(userId);
      }

      return Promise.resolve(createMockSubscriptionUsage({
        user_id: userId,
        usage_type: usageType,
        current_count: currentCount,
        limit_count: usageType === 'questionnaires' ? 1 : 50,
      }));
    }),
    findAll: jest.fn().mockResolvedValue([createMockSubscriptionUsage()]),
    findOrCreate: jest.fn().mockImplementation((options) => {
      const userId = options.where.user_id;
      const usageType = options.where.usage_type;

      let currentCount = 0;
      if (usageType === 'questionnaires') {
        if (!mockUserUsageCounts.has(userId)) {
          mockUserUsageCounts.set(userId, 0);
        }
        currentCount = mockUserUsageCounts.get(userId);
      }

      const record = createMockSubscriptionUsage({
        user_id: userId,
        usage_type: usageType,
        current_count: currentCount,
        limit_count: usageType === 'questionnaires' ? 1 : 50,
      });
      return Promise.resolve([record, true]);
    }),
    upsert: jest.fn().mockResolvedValue([createMockSubscriptionUsage(), true]),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  PaymentTransaction: {
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockPaymentTransaction(data));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockPaymentTransaction({
        id: parseInt(id),
        user_id: 1,
        payment_method: 'dana',
        amount: 99000,
        currency: 'IDR',
        status: 'pending',
        subscription_plan: 'starter',
      }));
    }),
    findOne: jest.fn().mockResolvedValue(createMockPaymentTransaction()),
    findAll: jest.fn().mockResolvedValue([createMockPaymentTransaction()]),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  NotificationPreference: {
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockNotificationPreference(data));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockNotificationPreference());
    }),
    findOne: jest.fn().mockResolvedValue(createMockNotificationPreference()),
    findAll: jest.fn().mockResolvedValue([createMockNotificationPreference()]),
    upsert: jest.fn().mockResolvedValue([createMockNotificationPreference(), true]),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  NotificationHistory: {
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockNotificationHistory(data));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockNotificationHistory({
        id: parseInt(id),
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Test',
        email_status: 'queued',
        sent_at: null,
        delivered_at: null,
        created_at: new Date(),
      }));
    }),
    findOne: jest.fn().mockResolvedValue(createMockNotificationHistory()),
    findAll: jest.fn().mockResolvedValue([createMockNotificationHistory()]),
    findAndCountAll: jest.fn().mockResolvedValue({
      count: 1,
      rows: [createMockNotificationHistory()],
    }),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  AuditLog: {
    create: jest.fn().mockImplementation((data) => {
      return Promise.resolve(createMockAuditLog(data));
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === 99999) return Promise.resolve(null);
      return Promise.resolve(createMockAuditLog({
        id: parseInt(id),
        user_id: 1,
        action: 'test',
        resource_type: 'test',
        resource_id: null,
        details: {},
        ip_address: '127.0.0.1',
        user_agent: 'Test User Agent',
        created_at: new Date(),
      }));
    }),
    findOne: jest.fn().mockResolvedValue(createMockAuditLog()),
    findAll: jest.fn().mockResolvedValue([createMockAuditLog()]),
    findAndCountAll: jest.fn().mockResolvedValue({
      count: 1,
      rows: [createMockAuditLog()],
    }),
    destroy: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue([1]),
    where: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
  initialize: jest.fn().mockResolvedValue(true),
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
  },
};