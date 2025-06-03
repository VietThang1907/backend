const UserSubscription = require('../models/subscription');
const User = require('../models/user');

/**
 * Middleware để kiểm tra và cập nhật trạng thái gói Premium đã hết hạn
 */
const checkSubscriptionExpiry = async (req, res, next) => {
  try {
    // Chỉ kiểm tra nếu người dùng đã đăng nhập
    if (req.user && req.user._id) {
      const userId = req.user._id;
      
      // Tìm gói đăng ký hiện tại của người dùng
      const activeSubscription = await UserSubscription.findOne({
        userId,
        isActive: true,
        status: 'active',
        endDate: { $exists: true }
      });
      
      // Nếu có gói đăng ký active và đã hết hạn
      if (activeSubscription && new Date() > new Date(activeSubscription.endDate)) {
        // Cập nhật trạng thái gói đăng ký
        activeSubscription.isActive = false;
        activeSubscription.status = 'expired';
        await activeSubscription.save();
        
        // Kiểm tra xem người dùng còn gói đăng ký active nào khác không
        const hasActiveSubscription = await UserSubscription.exists({
          userId,
          isActive: true,
          status: 'active'
        });
        
        // Nếu không còn gói active nào, cập nhật trạng thái premium của người dùng
        if (!hasActiveSubscription) {
          await User.findByIdAndUpdate(userId, { isPremium: false });
          
          // Cập nhật thông tin user trong request nếu cần thiết
          if (req.user.isPremium) {
            req.user.isPremium = false;
          }
        }
      }
    }
    
    // Tiếp tục middleware chain
    next();
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    next(); // Tiếp tục middleware chain ngay cả khi có lỗi
  }
};

module.exports = checkSubscriptionExpiry;