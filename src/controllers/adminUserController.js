// src/controllers/adminUserController.js

const User = require('../models/user');
const Role = require('../models/role');
const AccountType = require('../models/accountType');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

/**
 * Lấy danh sách người dùng có phân trang
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Áp dụng các bộ lọc nếu có
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.role) {
      filter.role_id = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { fullname: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Tìm kiếm người dùng với populate roles và accountType
    const users = await User.find(filter)
      .populate('role_id', 'name')
      .populate('accountTypeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Đếm tổng số người dùng
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Trả về kết quả
    return responseHelper.successResponse(res, 'Users retrieved successfully', {
      users: users.map(user => ({
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role_id,
        accountType: user.accountTypeId,
        isActive: user.isActive !== false, // Đảm bảo trả về boolean
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin || null,
        avatar: user.avatar || null
      })),
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalUsers: totalUsers,
        usersPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve users');
  }
};

/**
 * Lấy thông tin chi tiết một người dùng theo ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate('role_id', 'name')
      .populate('accountTypeId', 'name');
    
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    return responseHelper.successResponse(res, 'User retrieved successfully', {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role_id,
      accountType: user.accountTypeId,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin || null,
      avatar: user.avatar || null
    });
  } catch (error) {
    console.error(`Error getting user ${req.params.userId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve user');
  }
};

/**
 * Tạo người dùng mới
 */
exports.createUser = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationErrorResponse(res, 'Validation failed', errors.array());
    }
    
    const { fullname, email, password, role, accountType, isActive } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return responseHelper.errorResponse(res, 'Email already in use', 400);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      fullname,
      email,
      password: hashedPassword,
      role_id: role,
      accountTypeId: accountType,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await newUser.save();
    
    return responseHelper.successResponse(res, 'User created successfully', {
      _id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email
    }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to create user');
  }
};

/**
 * Cập nhật thông tin người dùng
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullname, email, password, role, accountType, isActive } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    // Check if email is taken by another user
    if (email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return responseHelper.errorResponse(res, 'Email already in use by another user', 400);
      }
    }
    
    // Update fields
    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.role_id = role || user.role_id;
    user.accountTypeId = accountType || user.accountTypeId;
    user.isActive = isActive !== undefined ? isActive : user.isActive;
    
    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    
    return responseHelper.successResponse(res, 'User updated successfully', {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(`Error updating user ${req.params.userId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to update user');
  }
};

/**
 * Xóa người dùng
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    await User.findByIdAndDelete(userId);
    
    return responseHelper.successResponse(res, 'User deleted successfully');
  } catch (error) {
    console.error(`Error deleting user ${req.params.userId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to delete user');
  }
};

/**
 * Cấm người dùng
 */
exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    user.isActive = false;
    await user.save();
    
    return responseHelper.successResponse(res, 'User banned successfully', {
      _id: user._id,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(`Error banning user ${req.params.userId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to ban user');
  }
};

/**
 * Bỏ cấm người dùng
 */
exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    user.isActive = true;
    await user.save();
    
    return responseHelper.successResponse(res, 'User unbanned successfully', {
      _id: user._id,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(`Error unbanning user ${req.params.userId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to unban user');
  }
};

/**
 * Bật tắt trạng thái tài khoản người dùng
 */
exports.toggleUserActiveStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'User not found');
    }
    
    user.isActive = isActive;
    await user.save();
    
    return responseHelper.successResponse(res, `User ${isActive ? 'activated' : 'deactivated'} successfully`, {
      _id: user._id,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(`Error toggling user ${req.params.userId} status:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to toggle user status');
  }
};

/**
 * Upload avatar cho người dùng (dành cho admin)
 */
exports.uploadUserAvatar = async (req, res) => {
  try {
    console.log("=== ADMIN: UPLOAD USER AVATAR ===");
    const { userId } = req.params;
    console.log("⭐ Upload avatar for userId:", userId);
    
    // Kiểm tra xem có file được upload không
    if (!req.file) {
      console.log("❌ No file uploaded");
      return responseHelper.errorResponse(res, "Không có file nào được gửi lên", 400);
    }
    
    console.log("✅ Received file:", req.file);
    console.log("File path:", req.file.path);
    console.log("File mimetype:", req.file.mimetype);
    console.log("File size:", req.file.size);
    
    // Kiểm tra xem người dùng có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      console.log("❌ User not found");
      return responseHelper.errorResponse(res, "Người dùng không tồn tại", 404);
    }
    
    // Import Cloudinary
    const cloudinary = require('../config/cloudinary');
    
    // Upload file lên Cloudinary
    console.log("☁️ Uploading to Cloudinary...");
    const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "movie-streaming/avatars",
      public_id: `user_${userId}_${Date.now()}`,
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" }
      ]
    });
    
    console.log("☁️ Cloudinary result:", cloudinaryResult.secure_url);
    
    // Xóa file tạm sau khi upload lên Cloudinary
    const fs = require('fs');
    try {
      fs.unlinkSync(req.file.path);
      console.log("✅ Temporary file deleted:", req.file.path);
    } catch (err) {
      console.log("⚠️ Could not delete temp file:", err);
    }

    // Nếu người dùng đã có Cloudinary ID cho avatar cũ, xóa nó
    if (user.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.cloudinaryPublicId);
        console.log("☁️ Deleted old avatar from Cloudinary:", user.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.log("⚠️ Could not delete old avatar from Cloudinary:", cloudinaryError);
      }
    }

    // Cập nhật đường dẫn avatar mới vào DB
    user.avatar = cloudinaryResult.secure_url;
    user.cloudinaryPublicId = cloudinaryResult.public_id;
    
    await user.save();
    console.log("✅ Saved new avatar path to DB:", user.avatar);

    // Trả về kết quả
    return responseHelper.successResponse(res, "Upload avatar thành công", {
      success: true,
      avatarUrl: cloudinaryResult.secure_url,
      userId: user._id
    });
    
  } catch (error) {
    console.error("❌ Error uploading avatar:", error);    return responseHelper.errorResponse(res, `Lỗi khi upload avatar: ${error.message}`, 500);
  }
};

/**
 * Lấy danh sách vai trò
 */
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    
    return responseHelper.successResponse(res, 'Roles retrieved successfully', {
      roles: roles.map(role => ({
        _id: role._id,
        name: role.name,
        description: role.description
      }))
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve roles');
  }
};

/**
 * Tạo vai trò mới
 */
exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return responseHelper.errorResponse(res, 'Role with this name already exists', 400);
    }
    
    const newRole = new Role({
      name,
      description
    });
    
    await newRole.save();
    
    return responseHelper.successResponse(res, 'Role created successfully', {
      _id: newRole._id,
      name: newRole.name,
      description: newRole.description
    }, 201);
  } catch (error) {
    console.error('Error creating role:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to create role');
  }
};

/**
 * Cập nhật vai trò
 */
exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description } = req.body;
    
    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return responseHelper.notFoundResponse(res, 'Role not found');
    }
    
    // Check if name is taken by another role
    if (name !== role.name) {
      const nameExists = await Role.findOne({ name, _id: { $ne: roleId } });
      if (nameExists) {
        return responseHelper.errorResponse(res, 'Role with this name already exists', 400);
      }
    }
    
    role.name = name || role.name;
    role.description = description || role.description;
    
    await role.save();
    
    return responseHelper.successResponse(res, 'Role updated successfully', {
      _id: role._id,
      name: role.name,
      description: role.description
    });
  } catch (error) {
    console.error(`Error updating role ${req.params.roleId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to update role');
  }
};

/**
 * Xóa vai trò
 */
exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    
    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return responseHelper.notFoundResponse(res, 'Role not found');
    }
    
    // Check if role is in use by any user
    const usersWithRole = await User.countDocuments({ role_id: roleId });
    if (usersWithRole > 0) {
      return responseHelper.errorResponse(res, `Cannot delete role. It is assigned to ${usersWithRole} user(s).`, 400);
    }
    
    await Role.findByIdAndDelete(roleId);
    
    return responseHelper.successResponse(res, 'Role deleted successfully');
  } catch (error) {
    console.error(`Error deleting role ${req.params.roleId}:`, error);
    return responseHelper.serverErrorResponse(res, 'Failed to delete role');
  }
};

/**
 * Lấy danh sách loại tài khoản
 */
exports.getAccountTypes = async (req, res) => {
  try {
    const accountTypes = await AccountType.find().sort({ name: 1 });
    
    return responseHelper.successResponse(res, 'Account types retrieved successfully', {
      accountTypes: accountTypes.map(type => ({
        _id: type._id,
        name: type.name,
        description: type.description
      }))
    });
  } catch (error) {
    console.error('Error getting account types:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve account types');
  }
};
