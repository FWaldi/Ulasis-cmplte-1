import { AdminUser, AdminRole, AdminActivity, User, EnterpriseReport } from '../models';

/**
 * Enterprise Admin Service for comprehensive admin management
 */
class EnterpriseAdminService {
  constructor() {
    this.permissionLevels = {
      'super_admin': 100,
      'admin': 80,
      'manager': 60,
      'support': 40,
      'analyst': 30,
    };

    this.defaultPermissions = {
      'super_admin': ['*'],
      'admin': [
        'user_management', 'subscription_management', 'content_moderation',
        'analytics_view', 'reports_generate', 'system_monitoring', 'admin_management'
      ],
      'manager': [
        'user_view', 'user_update', 'subscription_view', 'analytics_view', 'reports_generate'
      ],
      'support': [
        'user_view', 'user_update_basic', 'subscription_view', 'content_moderation'
      ],
      'analyst': [
        'analytics_view', 'reports_generate', 'user_view', 'subscription_view'
      ],
    };
  }

  /**
   * Create a new admin user
   * @param {Object} adminData - Admin user data
   * @returns {Promise<Object>} Created admin user
   */
  async createAdminUser(adminData) {
    try {
      const { userId, roleId, department, customPermissions } = adminData;

      // Verify user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify role exists
      const role = await AdminRole.findByPk(roleId);
      if (!role) {
        throw new Error('Admin role not found');
      }

      // Check if user is already an admin
      const existingAdmin = await AdminUser.findOne({ where: { user_id: userId } });
      if (existingAdmin) {
        throw new Error('User is already an admin');
      }

      // Generate API key if needed
      const apiKey = customPermissions?.api_access ? 
        this.generateApiKey() : null;

      // Create admin user
      const adminUser = await AdminUser.create({
        user_id: userId,
        role_id: roleId,
        department: department || null,
        permissions: customPermissions || null,
        api_key: apiKey,
        api_access_enabled: customPermissions?.api_access || false,
      });

      // Log activity
      await this.logActivity(adminUser.id, 'CREATE_ADMIN', 'admin_user', adminUser.id, {
        user_id: userId,
        role_id: roleId,
        department,
      });

      logger.info('Admin user created successfully', {
        adminUserId: adminUser.id,
        userId,
        roleId,
        department,
      });

      return {
        success: true,
        data: await this.getAdminUserWithDetails(adminUser.id),
      };
    } catch (error) {
      logger.error('Failed to create admin user', { error: error.message, adminData });
      throw error;
    }
  }

  /**
   * Get admin user with full details
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} Admin user details
   */
  async getAdminUserWithDetails(adminUserId) {
    const adminUser = await AdminUser.findByPk(adminUserId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name', 'created_at'],
        },
        {
          model: AdminRole,
          as: 'role',
          attributes: ['id', 'name', 'display_name', 'permissions', 'level'],
        },
      ],
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Get effective permissions
    const effectivePermissions = this.getEffectivePermissions(adminUser);

    return {
      ...adminUser.toJSON(),
      effective_permissions: effectivePermissions,
    };
  }

  /**
   * Get all admin users with pagination and filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Paginated admin users
   */
  async getAdminUsers(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      roleId,
      department,
      isActive,
    } = filters;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (search) {
      where[Op.or] = [
        { '$user.email$': { [Op.like]: `%${search}%` } },
        { '$user.first_name$': { [Op.like]: `%${search}%` } },
        { '$user.last_name$': { [Op.like]: `%${search}%` } },
      ];
    }

    if (roleId) where.role_id = roleId;
    if (department) where.department = department;
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const { count, rows: adminUsers } = await AdminUser.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name', 'created_at'],
        },
        {
          model: AdminRole,
          as: 'role',
          attributes: ['id', 'name', 'display_name', 'level'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Add effective permissions to each admin
    const adminUsersWithPermissions = await Promise.all(
      adminUsers.map(async (admin) => {
        const effectivePermissions = this.getEffectivePermissions(admin);
        return {
          ...admin.toJSON(),
          effective_permissions: effectivePermissions,
        };
      })
    );

    return {
      success: true,
      data: {
        admin_users: adminUsersWithPermissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    };
  }

  /**
   * Update admin user
   * @param {number} adminUserId - Admin user ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated admin user
   */
  async updateAdminUser(adminUserId, updateData) {
    try {
      const adminUser = await AdminUser.findByPk(adminUserId);
      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      const oldValues = { ...adminUser.toJSON() };

      // Handle API key regeneration
      if (updateData.regenerate_api_key) {
        updateData.api_key = this.generateApiKey();
      }

      // Update admin user
      await adminUser.update(updateData);

      // Log activity
      await this.logActivity(adminUserId, 'UPDATE_ADMIN', 'admin_user', adminUserId, {
        oldValues,
        newValues: updateData,
      });

      logger.info('Admin user updated successfully', {
        adminUserId,
        updateData,
      });

      return {
        success: true,
        data: await this.getAdminUserWithDetails(adminUserId),
      };
    } catch (error) {
      logger.error('Failed to update admin user', {
        error: error.message,
        adminUserId,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Check admin permissions
   * @param {number} adminUserId - Admin user ID
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} Has permission
   */
  async checkPermission(adminUserId, permission) {
    try {
      const adminUser = await AdminUser.findByPk(adminUserId, {
        include: [{ model: AdminRole, as: 'role' }],
      });

      if (!adminUser || !adminUser.is_active) {
        return false;
      }

      const effectivePermissions = this.getEffectivePermissions(adminUser);
      return effectivePermissions.includes('*') || effectivePermissions.includes(permission);
    } catch (error) {
      logger.error('Error checking admin permission', {
        error: error.message,
        adminUserId,
        permission,
      });
      return false;
    }
  }

  /**
   * Get effective permissions for admin user
   * @param {Object} adminUser - Admin user with role
   * @returns {Array<string>} Effective permissions
   */
  getEffectivePermissions(adminUser) {
    const rolePermissions = adminUser.role?.permissions || [];
    const customPermissions = adminUser.permissions || [];

    // If role has wildcard permission, return all
    if (rolePermissions.includes('*')) {
      return ['*'];
    }

    // Merge role permissions with custom permissions
    return [...new Set([...rolePermissions, ...customPermissions])];
  }

  /**
   * Log admin activity
   * @param {number} adminUserId - Admin user ID
   * @param {string} action - Action performed
   * @param {string} resourceType - Resource type
   * @param {number} resourceId - Resource ID
   * @param {Object} details - Additional details
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Created activity log
   */
  async logActivity(adminUserId, action, resourceType, resourceId, details = {}, metadata = {}) {
    try {
      const activity = await AdminActivity.create({
        admin_user_id: adminUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent,
        session_id: metadata.sessionId,
        duration_ms: metadata.duration,
        status: metadata.status || 'success',
        error_message: metadata.errorMessage,
      });

      return activity;
    } catch (error) {
      logger.error('Failed to log admin activity', {
        error: error.message,
        adminUserId,
        action,
      });
      throw error;
    }
  }

  /**
   * Get admin activities with filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Paginated activities
   */
  async getAdminActivities(filters = {}) {
    const {
      page = 1,
      limit = 50,
      adminUserId,
      action,
      resourceType,
      status,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (adminUserId) where.admin_user_id = adminUserId;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (resourceType) where.resource_type = resourceType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const { count, rows: activities } = await AdminActivity.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: AdminUser,
          as: 'adminUser',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'first_name', 'last_name'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return {
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    };
  }

  /**
   * Generate secure API key
   * @returns {string} Generated API key
   */
  generateApiKey() {
    return `uk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Update admin login tracking
   * @param {number} adminUserId - Admin user ID
   * @param {Object} metadata - Login metadata
   * @returns {Promise<Object>} Updated admin user
   */
  async updateAdminLogin(adminUserId, metadata = {}) {
    try {
      await AdminUser.update(
        {
          last_login_at: new Date(),
          login_count: Sequelize.literal('login_count + 1'),
        },
        { where: { id: adminUserId } }
      );

      // Log login activity
      await this.logActivity(adminUserId, 'ADMIN_LOGIN', 'session', null, {}, {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        sessionId: metadata.sessionId,
      });

      logger.info('Admin login tracked', { adminUserId, metadata });

      return { success: true };
    } catch (error) {
      logger.error('Failed to update admin login', {
        error: error.message,
        adminUserId,
      });
      throw error;
    }
  }

  /**
   * Get admin dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [
        totalAdmins,
        activeAdmins,
        totalActivities,
        recentLogins,
        roleDistribution,
      ] = await Promise.all([
        AdminUser.count(),
        AdminUser.count({ where: { is_active: true } }),
        AdminActivity.count({ where: { created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
        AdminActivity.count({ 
          where: { 
            action: 'ADMIN_LOGIN',
            created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          } 
        }),
        AdminUser.findAll({
          include: [{ model: AdminRole, as: 'role', attributes: ['name'] }],
          attributes: [],
        }),
      ]);

      // Calculate role distribution
      const roleStats = roleDistribution.reduce((acc, admin) => {
        const roleName = admin.role?.name || 'unknown';
        acc[roleName] = (acc[roleName] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          overview: {
            total_admins: totalAdmins,
            active_admins: activeAdmins,
            total_activities_30d: totalActivities,
            recent_logins_7d: recentLogins,
          },
          role_distribution: roleStats,
        },
      };
    } catch (error) {
      logger.error('Failed to get dashboard stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new EnterpriseAdminService();