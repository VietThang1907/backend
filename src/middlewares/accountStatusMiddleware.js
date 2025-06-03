const User = require('../models/user');
const responseHelper = require('../utils/responseHelper');

/**
 * Middleware kiểm tra trạng thái tài khoản người dùng
 * Middleware này sẽ được áp dụng cho các routes cần bảo vệ
 * để đảm bảo tài khoản bị khóa không thể truy cập
 */
const checkAccountStatus = async (req, res, next) => {
  try {
    // Lấy ID người dùng từ request đã xác thực
    const userId = req.user.userId || req.user._id;
    
    if (!userId) {
      return responseHelper.unauthorizedResponse(res, 'Không thể xác thực người dùng');
    }

    // Tìm người dùng trong database
    const user = await User.findById(userId);
    
    if (!user) {
      return responseHelper.notFoundResponse(res, 'Không tìm thấy người dùng');
    }

    // Kiểm tra nếu tài khoản bị khóa (isActive = false)
    if (user.isActive === false) {
      // Gửi response cụ thể cho tài khoản bị khóa
      return responseHelper.forbiddenResponse(res, {
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        isAccountLocked: true,
        userId: user._id
      });
    }

    // Tài khoản đang hoạt động bình thường, cho phép tiếp tục
    next();
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái tài khoản:', error);
    return responseHelper.serverErrorResponse(res, 'Lỗi hệ thống khi kiểm tra trạng thái tài khoản');
  }
};

module.exports = {
  checkAccountStatus
};