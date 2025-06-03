// src/middlewares/adminMiddleware.js
const User = require('../models/user');
const Role = require('../models/role');

/**
 * Middleware to check if user has admin role
 */
exports.isAdmin = async (req, res, next) => {
  try {
    // req.user should be populated from the verifyToken middleware
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required'
      });
    }

    // Get user with role information - updated to use role_id
    const user = await User.findById(req.user._id).populate('role_id');
    
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found'
      });
    }

    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({
        statusCode: 403,
        message: 'User is banned'
      });
    }

    // Check role using the correct role_id field
    if (user.role_id && user.role_id.name && user.role_id.name.toLowerCase() === 'admin') {
      return next(); // User is admin, proceed
    }

    // If we reach here, user is not an admin
    return res.status(403).json({
      statusCode: 403,
      message: 'Access denied: Admin privileges required'
    });
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};