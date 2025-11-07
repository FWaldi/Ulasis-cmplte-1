'use strict';

const bcrypt = require('bcrypt');

// In-memory store for mock users
const userStore = new Map();

// Mock User model for testing
const createMockUser = (overrides = {}) => {
  const defaultUser = {
    id: userStore.size + 1,
    email: 'test@example.com',
    password_hash: '$2b$12$p.h.e.n.g.l.u.i.m.o.r.d.a.n.g.a.n', // "TestPassword123"
    first_name: 'Test',
    last_name: 'User',
    email_verified: true,
    is_active: true,
    login_attempts: 0,
    locked_until: null,
    verification_token: null,
    password_reset_token: null,
    subscription_plan: 'free',
    ...overrides,
  };

  const mockUserInstance = {
    ...defaultUser,
    isLocked: jest.fn().mockReturnValue(false),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockImplementation(async (data) => {
      if (data.password) {
        defaultUser.password_hash = await bcrypt.hash(data.password, 12);
        mockUserInstance.password_hash = defaultUser.password_hash;
      }
      Object.assign(defaultUser, data);
      Object.assign(mockUserInstance, data);
      for (const [key, user] of userStore.entries()) {
        if (user.id === mockUserInstance.id || user.email === mockUserInstance.email) {
          userStore.set(key, mockUserInstance);
        }
      }
      return [1];
    }),
    reload: jest.fn().mockResolvedValue(true),
    validatePassword: jest.fn().mockImplementation(async (password) => {
      if (!defaultUser.password_hash) return false;
      return await bcrypt.compare(password, defaultUser.password_hash);
    }),
    generateEmailVerificationToken: jest.fn().mockImplementation(() => {
      const token = `test-verification-token-${mockUserInstance.id}-${Date.now()}`;
      mockUserInstance.email_verification_token = token;
      mockUserInstance.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      defaultUser.email_verification_token = token;
      defaultUser.email_verification_expires = mockUserInstance.email_verification_expires;
      return token;
    }),
    generatePasswordResetToken: jest.fn().mockImplementation(() => {
      const token = `test-reset-token-${mockUserInstance.id}-${Date.now()}`;
      mockUserInstance.password_reset_token = token;
      mockUserInstance.password_reset_expires = new Date(Date.now() + 1 * 60 * 60 * 1000);
      defaultUser.password_reset_expires = mockUserInstance.password_reset_expires;
      return token;
    }),
    resetLoginAttempts: jest.fn().mockImplementation(async () => {
      mockUserInstance.login_attempts = 0;
      mockUserInstance.locked_until = null;
      mockUserInstance.last_login_at = new Date();
      defaultUser.login_attempts = 0;
      defaultUser.locked_until = null;
      defaultUser.last_login_at = mockUserInstance.last_login_at;
      return true;
    }),
    incrementLoginAttempts: jest.fn().mockImplementation(async () => {
      mockUserInstance.login_attempts += 1;
      defaultUser.login_attempts = mockUserInstance.login_attempts;
      if (mockUserInstance.login_attempts >= 5) {
        mockUserInstance.locked_until = new Date(Date.now() + 2 * 60 * 60 * 1000);
        defaultUser.locked_until = mockUserInstance.locked_until;
      }
      return true;
    }),
    get: jest.fn().mockImplementation((key) => {
      // Handle both subscription_plan and subscriptionPlan for compatibility
      if (key === 'subscriptionPlan') {
        return defaultUser.subscription_plan;
      }
      return mockUserInstance[key] || defaultUser[key];
    }),
    toJSON: jest.fn().mockImplementation(() => ({
      id: mockUserInstance.id,
      email: mockUserInstance.email,
      first_name: mockUserInstance.first_name,
      last_name: mockUserInstance.last_name,
      email_verified: mockUserInstance.email_verified,
      login_attempts: mockUserInstance.login_attempts,
      locked_until: mockUserInstance.locked_until,
      subscription_plan: mockUserInstance.subscription_plan,
    })),
  };

  return mockUserInstance;
};

// Don't create a default user as it interferes with tests
// const mockUser = createMockUser();

const mockUserModel = {
  create: jest.fn().mockImplementation(async (data) => {
    const userData = { ...data };
    if (userData.password) {
      userData.password_hash = await bcrypt.hash(userData.password, 12);
      delete userData.password;
    }
    const newUser = createMockUser(userData);
    userStore.set(userData.email, newUser);
    userStore.set(`id:${newUser.id}`, newUser);
    return newUser;
  }),
  findByPk: jest.fn().mockImplementation((id) => {
    const userById = userStore.get(`id:${id}`);
    if (userById) {
      return Promise.resolve(userById);
    }
    for (const user of userStore.values()) {
      if (user.id === id && !user.email.startsWith('id:')) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }),
  findOne: jest.fn().mockImplementation((options) => {
    if (options.where && options.where.email) {
      const user = userStore.get(options.where.email);
      return Promise.resolve(user || null);
    }
    return Promise.resolve(null); // Don't return default mock user
  }),
  findAll: jest.fn().mockResolvedValue(Array.from(userStore.values())),
  destroy: jest.fn().mockImplementation((options) => {
    if (options.where && options.where.email) {
      userStore.delete(options.where.email);
    }
    return Promise.resolve(1);
  }),
  update: jest.fn().mockResolvedValue([1]),
  count: jest.fn().mockResolvedValue(userStore.size),
  findByEmail: jest.fn().mockImplementation((email) => {
    const user = userStore.get(email);
    return Promise.resolve(user || null);
  }),
  findByVerificationToken: jest.fn().mockImplementation((token) => {
    for (const user of userStore.values()) {
      if (user.email_verification_token === token) {
        const now = new Date();
        if (user.email_verification_expires && user.email_verification_expires <= now) {
          return Promise.resolve(null);
        }
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }),
  findByPasswordResetToken: jest.fn().mockImplementation((token) => {
    for (const user of userStore.values()) {
      if (user.password_reset_token === token) {
        if (user.password_reset_expires && user.password_reset_expires <= new Date()) {
          return Promise.resolve(null);
        }
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }),
  scope: jest.fn().mockImplementation((scopeName) => {
    if (scopeName === 'active') {
      return {
        findByEmail: jest.fn().mockImplementation((email) => {
          const user = userStore.get(email);
          return Promise.resolve(user && user.is_active ? user : null);
        }),
        findByPk: jest.fn().mockImplementation((id) => {
          const userById = userStore.get(`id:${id}`);
          if (userById && userById.is_active) return Promise.resolve(userById);
          for (const user of userStore.values()) {
            if (user.id === id && user.is_active && !user.email.startsWith('id:')) {
              return Promise.resolve(user);
            }
          }
          return Promise.resolve(null);
        }),
      };
    }
    return mockUserModel;
  }),
  unscoped: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  include: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
};

mockUserModel.clearStore = () => userStore.clear();

module.exports = {
  User: mockUserModel,
  // mockUser, // Removed to prevent interference with tests
  createMockUser,
};
