const User = require('../models/user');
const responseHelper = require('../utils/responseHelper');

/**
 * Kiểm tra trạng thái tài khoản người dùng
 */
exports.checkAccountStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(res, 'Không tìm thấy người dùng');
    }

    // Kiểm tra trạng thái tài khoản
    if (user.isActive === false) {
      return responseHelper.forbiddenResponse(res, {
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        isAccountLocked: true
      });
    }

    // Tài khoản đang hoạt động bình thường
    return responseHelper.successResponse(res, 'Tài khoản đang hoạt động', {
      isActive: true,
      userId: user._id
    });
  } catch (error) {
    console.error('Error in checkAccountStatus:', error);
    return responseHelper.serverErrorResponse(res, 'Không thể kiểm tra trạng thái tài khoản');
  }
};