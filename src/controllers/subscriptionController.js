const { SubscriptionPackage, UserSubscription } = require("../models/subscription");
const User = require("../models/user");
const Payment = require("../models/payment");
const AccountType = require("../models/accountType");
const responseHelper = require("../utils/responseHelper");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

/**
 * Lấy danh sách tất cả các gói đăng ký có sẵn
 */
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await SubscriptionPackage.find({ isActive: true })
      .populate("accountTypeId", "name")
      .sort({ price: 1 });

    return responseHelper.successResponse(
      res,
      "Lấy danh sách gói đăng ký thành công",
      packages
    );
  } catch (error) {
    console.error("Error in getAllPackages:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách gói đăng ký"
    );
  }
};

/**
 * Lấy thông tin chi tiết về một gói đăng ký
 */
exports.getPackageById = async (req, res) => {
  try {
    const packageId = req.params.id;
    const packageDetail = await SubscriptionPackage.findById(packageId)
      .populate("accountTypeId", "name");

    if (!packageDetail) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký"
      );
    }

    return responseHelper.successResponse(
      res,
      "Lấy thông tin gói đăng ký thành công",
      packageDetail
    );
  } catch (error) {
    console.error("Error in getPackageById:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy thông tin gói đăng ký"
    );
  }
};

/**
 * Get ad visibility benefits based on user's subscription
 */
exports.getAdBenefits = async (req, res) => {
  try {
    // Get authenticated user's ID
    const userId = req.user._id;
    
    // Find the user's active subscription
    const userSubscription = await UserSubscription.findOne({
      userId,
      isActive: true,
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).populate('packageId');
    
    if (!userSubscription) {
      // No active subscription
      return responseHelper.successResponse(res, "User has no active subscription", {
        hideHomepageAds: false,
        hideVideoAds: false,
        packageType: null,
        hasActiveSubscription: false
      });
    }
    
    // Get package type to determine ad benefits
    const packageId = userSubscription.packageId._id.toString();
    
    let hideHomepageAds = false;
    let hideVideoAds = false;
    
    // Apply benefits based on package type
    if (packageId) {
      // Package 1: Hide only homepage ads
      if (packageId === process.env.PACKAGE_TYPE_1 || userSubscription.packageId.name.includes('Basic')) {
        hideHomepageAds = true;
      }
      // Package 2: Hide all ads (homepage + video)
      else if (packageId === process.env.PACKAGE_TYPE_2 || userSubscription.packageId.name.includes('Premium')) {
        hideHomepageAds = true;
        hideVideoAds = true;
      }
    }
    
    return responseHelper.successResponse(res, "Ad benefits retrieved successfully", {
      hideHomepageAds,
      hideVideoAds,
      packageType: packageId,
      hasActiveSubscription: true
    });
  } catch (error) {
    console.error("Error in getAdBenefits:", error);
    return responseHelper.serverErrorResponse(res, "Cannot retrieve ad benefits");
  }
};
   

/**
 * Đăng ký gói premium cho người dùng
 */
exports.subscribePackage = async (req, res) => {
  try {
    const { packageId, paymentMethod } = req.body;
    
    // Fix userId extraction from auth token
    let userId;
    if (req.user.userId) {
      userId = req.user.userId;
    } else if (req.user._id) {
      userId = req.user._id;
    } else {
      console.error("Cannot identify user ID from request:", req.user);
      return responseHelper.badRequestResponse(
        res, 
        "Không thể xác định người dùng. Vui lòng đăng nhập lại."
      );
    }
    
    console.log(`Creating subscription for user: ${userId}, package: ${packageId}, payment method: ${paymentMethod}`);

    // Tìm gói đăng ký trong cơ sở dữ liệu
    const packageDetail = await SubscriptionPackage.findById(packageId);
    if (!packageDetail || !packageDetail.isActive) {
      return responseHelper.notFoundResponse(
        res, 
        "Gói đăng ký không tồn tại hoặc không còn hoạt động"
      );
    }

    // Kiểm tra xem người dùng có đăng ký nào đang hoạt động không
    const activeSubscription = await UserSubscription.findOne({
      userId,
      status: "active"
    });

    if (activeSubscription) {
      return responseHelper.badRequestResponse(
        res, 
        "Bạn đã có gói đăng ký đang hoạt động"
      );
    }

    // Kiểm tra xem người dùng có đăng ký nào đang chờ duyệt không
    const pendingSubscription = await UserSubscription.findOne({
      userId,
      status: "pending"
    });

    if (pendingSubscription) {
      return responseHelper.badRequestResponse(
        res, 
        "Bạn đã có một yêu cầu đăng ký đang chờ duyệt"
      );
    }

    // Tạo bản ghi thanh toán
    const payment = new Payment({
      userId,
      amount: packageDetail.discount > 0 
        ? packageDetail.price * (1 - packageDetail.discount / 100) 
        : packageDetail.price,
      status: "pending",
      method: paymentMethod,
      description: `Thanh toán cho gói ${packageDetail.name}`,
      userConfirmed: true,
      userConfirmedAt: new Date()
    });

    await payment.save();
    console.log(`Payment created: ${payment._id}`);

    // Calculate temporary dates for subscription
    const tempStartDate = new Date();
    const tempEndDate = new Date();
    tempEndDate.setDate(tempStartDate.getDate() + packageDetail.durationDays);

    // Tạo đăng ký mới
    const newSubscription = new UserSubscription({
      userId,
      packageId: packageId,
      startDate: tempStartDate,
      endDate: tempEndDate,
      isActive: false,
      paymentId: payment._id,
      renewalStatus: "pending",
      autoRenewal: false,
      status: "pending",
      paymentConfirmed: true,
      accountTypeId: packageDetail.accountTypeId,
      notes: "Đang chờ admin duyệt"
    });

    await newSubscription.save();
    console.log(`Subscription created: ${newSubscription._id}`);
    console.log(`Successfully created subscription for user ${userId} with package ${packageId}`);

    return responseHelper.successResponse(
      res,
      "Yêu cầu đăng ký gói đã được gửi để duyệt",
      {
        subscription: newSubscription,
        package: packageDetail,
        payment: payment
      }
    );
  } catch (error) {
    console.error("Error in subscribePackage:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể đăng ký gói"
    );
  }
};

/**
 * Hủy yêu cầu đăng ký đang chờ duyệt hoặc hủy đăng ký hiện tại
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    console.log(`Attempting to cancel subscription for user: ${userId}`);
    
    // Kiểm tra xem người dùng có đăng ký đang chờ duyệt không
    const pendingSubscription = await UserSubscription.findOne({
      userId,
      status: "pending"
    });

    if (pendingSubscription) {
      console.log(`Found pending subscription to cancel: ${pendingSubscription._id}`);
      // Lấy id của payment để xóa
      const paymentId = pendingSubscription.paymentId;
      
      // Xóa đăng ký khỏi database
      await UserSubscription.findByIdAndDelete(pendingSubscription._id);
      console.log(`Deleted subscription: ${pendingSubscription._id}`);
      
      // Xóa payment liên quan nếu có
      if (paymentId) {
        await Payment.findByIdAndDelete(paymentId);
        console.log(`Deleted payment: ${paymentId}`);
      }

      return responseHelper.successResponse(
        res,
        "Hủy yêu cầu đăng ký thành công",
        { success: true, deleted: true }
      );
    }
    
    // Nếu không có yêu cầu đang chờ duyệt, tìm đăng ký đang hoạt động của người dùng
    const activeSubscription = await UserSubscription.findOne({
      userId,
      isActive: true,
      status: "active"
    });

    if (!activeSubscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký đang hoạt động hoặc đang chờ duyệt"
      );
    }

    // Cập nhật trạng thái đăng ký
    activeSubscription.isActive = true; // Vẫn giữ hoạt động cho đến khi hết hạn
    activeSubscription.renewalStatus = "canceled";
    activeSubscription.autoRenewal = false;
    
    await activeSubscription.save();
    console.log(`Updated active subscription: ${activeSubscription._id} to renewalStatus=canceled`);

    // Chú ý: Không hạ cấp tài khoản ngay lập tức, mà chỉ sau khi hết hạn đăng ký

    return responseHelper.successResponse(
      res,
      "Hủy đăng ký thành công",
      { 
        message: "Bạn vẫn có thể sử dụng dịch vụ premium đến khi hết hạn",
        subscription: activeSubscription
      }
    );
  } catch (error) {
    console.error("Error in cancelSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể hủy đăng ký"
    );
  }
};

/**
 * Lấy thông tin gói đăng ký hiện tại của người dùng
 * Phương thức tối ưu truy vấn trực tiếp vào usersubscriptions với userId và isActive
 */
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    console.log(`Getting active subscription for user: ${userId}`);

    // Tìm gói đăng ký hiện tại đang hoạt động, chỉ kiểm tra isActive: true
    // Không cần kiểm tra status: 'active' vì chúng ta chỉ quan tâm gói đang hoạt động
    const currentSubscription = await UserSubscription.findOne({
      userId,
      isActive: true
    }).populate('packageId');

    if (!currentSubscription) {
      return responseHelper.successResponse(
        res, 
        "Người dùng không có gói đăng ký active", 
        { hasActiveSubscription: false }
      );
    }

    // Tính toán thời gian còn lại
    const now = new Date();
    const endDate = new Date(currentSubscription.endDate);
    
    // Tính số ngày còn lại
    const remainingTime = endDate > now 
      ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) 
      : 0;
    
    // Nếu gói đã hết hạn nhưng chưa được cập nhật
    if (remainingTime <= 0 && currentSubscription.isActive) {
      currentSubscription.isActive = false;
      currentSubscription.status = 'expired';
      await currentSubscription.save();
      
      // Cập nhật trạng thái premium của người dùng
      await User.findByIdAndUpdate(userId, { isPremium: false });
      
      return responseHelper.successResponse(
        res, 
        "Gói đăng ký đã hết hạn", 
        { 
          hasActiveSubscription: false,
          subscription: currentSubscription,
          daysLeft: 0,
          isExpired: true
        }
      );
    }

    return responseHelper.successResponse(
      res, 
      "Thông tin gói đăng ký hiện tại", 
      {
        hasActiveSubscription: true,
        subscription: currentSubscription,
        daysLeft: remainingTime,
        endDate: endDate,
        isExpired: remainingTime <= 0
      }
    );
  } catch (error) {
    console.error("Error in getCurrentSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy thông tin gói đăng ký"
    );
  }
};

/**
 * Lấy thông tin gói đăng ký hiện tại của người dùng
 * Đây là phiên bản tối ưu để truy vấn trực tiếp usersubscriptions bằng userId và isActive
 */
exports.getCurrentActiveSubscription = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    console.log(`Getting active subscription for user: ${userId}`);

    // Tìm gói đăng ký hiện tại đang hoạt động
    const activeSubscription = await UserSubscription.findOne({
      userId: userId,
      isActive: true
    }).populate('packageId');

    if (!activeSubscription) {
      return responseHelper.successResponse(
        res,
        "Người dùng không có gói đăng ký đang hoạt động",
        {
          success: true,
          hasActiveSubscription: false,
          subscription: null
        }
      );
    }

    // Tính số ngày còn lại
    const now = new Date();
    const endDate = new Date(activeSubscription.endDate);
    const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    return responseHelper.successResponse(
      res,
      "Thông tin gói đăng ký đang hoạt động",
      {
        success: true,
        hasActiveSubscription: true,
        subscription: activeSubscription,
        daysLeft: daysLeft
      }
    );
  } catch (error) {
    console.error("Error fetching current active subscription:", error);
    return responseHelper.serverErrorResponse(
      res,
      "Lỗi khi lấy thông tin gói đăng ký đang hoạt động"
    );
  }
};

/**
 * Kiểm tra và cập nhật gói đăng ký hết hạn cho người dùng hiện tại
 */
exports.checkCurrentUserExpiredSubscription = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    
    // Kiểm tra đăng ký hiện tại của người dùng
    const activeSubscription = await UserSubscription.findOne({
      userId,
      isActive: true,
      status: 'active'
    });
    
    if (!activeSubscription) {
      return responseHelper.successResponse(
        res,
        "Người dùng không có gói đăng ký nào đang hoạt động",
        { hasActiveSubscription: false }
      );
    }
    
    // Kiểm tra xem gói đăng ký đã hết hạn chưa
    const now = new Date();
    const endDate = new Date(activeSubscription.endDate);
    
    // Nếu gói đã hết hạn
    if (endDate < now) {
      console.log(`Gói đăng ký của người dùng ${userId} đã hết hạn vào ${endDate.toISOString()}`);
      
      // Cập nhật trạng thái đăng ký
      activeSubscription.isActive = false;
      activeSubscription.status = 'expired';
      await activeSubscription.save();
      
      // Tìm loại tài khoản Normal
      const AccountType = require('../models/accountType');
      const normalAccountType = await AccountType.findOne({ name: 'Normal' });
      
      // Tìm vai trò User
      const Role = require('../models/role');
      const userRole = await Role.findOne({ name: 'User' });
      
      // Chuẩn bị dữ liệu cập nhật cho người dùng
      const updateData = {
        isPremium: false,
        subscriptionEndDate: null
      };
      
      // Thêm trường accountTypeId nếu tìm thấy loại tài khoản Normal
      if (normalAccountType) {
        updateData.accountTypeId = normalAccountType._id;
      }
      
      // Kiểm tra vai trò hiện tại của người dùng
      const user = await User.findById(userId).populate('role_id');
      
      // Chỉ hạ cấp vai trò nếu không phải admin hoặc moderator
      if (userRole && (!user.role_id || (user.role_id.name !== 'Admin' && user.role_id.name !== 'Moderator'))) {
        updateData.role_id = userRole._id;
      }
      
      // Cập nhật thông tin người dùng
      await User.findByIdAndUpdate(userId, updateData);
      
      return responseHelper.successResponse(
        res,
        "Gói đăng ký đã hết hạn và người dùng đã được hạ cấp về tài khoản thường",
        { 
          hasActiveSubscription: false,
          subscriptionExpired: true,
          subscription: activeSubscription
        }
      );
    }
    
    // Nếu gói vẫn còn hạn, trả về thông tin
    return responseHelper.successResponse(
      res,
      "Gói đăng ký vẫn còn hiệu lực",
      {
        hasActiveSubscription: true,
        subscription: activeSubscription,
        remainingDays: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
        endDate: endDate
      }
    );
  } catch (error) {
    console.error("Error in checkCurrentUserExpiredSubscription:", error);
    return responseHelper.serverErrorResponse(
      res,
      "Lỗi khi kiểm tra gói đăng ký"
    );
  }
};

/**
 * Lấy lịch sử đăng ký của người dùng
 */
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const subscriptions = await UserSubscription.find({ userId })
      .populate("packageId")
      .populate("paymentId")
      .sort({ createdAt: -1 });

    return responseHelper.successResponse(
      res,
      "Lấy lịch sử đăng ký thành công",
      subscriptions
    );
  } catch (error) {
    console.error("Error in getSubscriptionHistory:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy lịch sử đăng ký"
    );
  }
};

/**
 * Cập nhật tự động gia hạn
 */
exports.updateAutoRenewal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { autoRenewal } = req.body;
    
    if (typeof autoRenewal !== 'boolean') {
      return responseHelper.badRequestResponse(
        res, 
        "Giá trị autoRenewal không hợp lệ"
      );
    }
    
    // Tìm đăng ký đang hoạt động của người dùng
    const subscription = await UserSubscription.findOne({
      userId,
      isActive: true
    });

    if (!subscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký đang hoạt động"
      );
    }

    // Cập nhật trạng thái tự động gia hạn
    subscription.autoRenewal = autoRenewal;
    await subscription.save();

    return responseHelper.successResponse(
      res,
      `${autoRenewal ? "Bật" : "Tắt"} tự động gia hạn thành công`,
      { subscription }
    );
  } catch (error) {
    console.error("Error in updateAutoRenewal:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể cập nhật tự động gia hạn"
    );
  }
};

/**
 * Lấy thông tin đăng ký đang chờ duyệt của người dùng hiện tại
 */
exports.getPendingSubscription = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    // Tìm đăng ký đang chờ duyệt của người dùng
    const subscription = await UserSubscription.findOne({
      userId,
      status: "pending"
    }).populate("paymentId").populate("packageId");

    if (!subscription) {
      return responseHelper.successResponse(
        res,
        "Không có đăng ký nào đang chờ duyệt",
        { hasPendingSubscription: false }
      );
    }
    
    return responseHelper.successResponse(
      res,
      "Lấy thông tin đăng ký chờ duyệt thành công",
      {
        hasPendingSubscription: true,
        pendingSubscription: subscription
      }
    );
  } catch (error) {
    console.error("Error in getPendingSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy thông tin đăng ký chờ duyệt"
    );
  }
};

/**
 * Hủy yêu cầu đăng ký đang chờ duyệt
 */
exports.cancelPendingSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId } = req.params;
    
    // Tìm đăng ký đang chờ duyệt của người dùng
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId,
      status: "pending"
    });

    if (!subscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy yêu cầu đăng ký hoặc yêu cầu không ở trạng thái chờ duyệt"
      );
    }
    
    // Cập nhật trạng thái đăng ký
    subscription.status = "cancelled";
    subscription.notes = "Cancelled by user";
    subscription.cancelledAt = new Date();
    await subscription.save();
    
    // Cập nhật trạng thái thanh toán nếu có
    if (subscription.paymentId) {
      await Payment.findByIdAndUpdate(
        subscription.paymentId,
        { 
          status: "refunded",
          notes: "Cancelled by user"
        }
      );
    }

    return responseHelper.successResponse(
      res,
      "Hủy yêu cầu đăng ký thành công",
      { subscription }
    );
  } catch (error) {
    console.error("Error in cancelPendingSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể hủy yêu cầu đăng ký"
    );
  }
};

/**
 * Lấy danh sách yêu cầu đăng ký đang chờ duyệt của người dùng hiện tại
 */
exports.getUserPendingSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const pendingSubscriptions = await UserSubscription.find({
      userId: userId,
      status: "pending"
    }).populate('packageId', 'name price durationDays');
    
    return responseHelper.successResponse(
      res,
      "Lấy danh sách yêu cầu đăng ký thành công",
      { subscriptions: pendingSubscriptions }
    );
  } catch (error) {
    console.error("Error in getUserPendingSubscriptions:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách yêu cầu đăng ký"
    );
  }
};

/**
 * Lấy danh sách các đăng ký của người dùng hiện tại
 */
exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const subscriptions = await UserSubscription.find({ userId })
      .populate('packageId', 'name price durationDays features')
      .sort({ createdAt: -1 });
    
    return responseHelper.successResponse(
      res,
      "Lấy danh sách đăng ký thành công",
      { subscriptions }
    );
  } catch (error) {
    console.error("Error in getUserSubscriptions:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách đăng ký"
    );
  }
};

// ====== ADMIN API ======

/**
 * [ADMIN] Lấy danh sách tất cả đăng ký người dùng
 */
exports.getAllSubscriptions = async (req, res) => {
  try {
    // Apply filters if provided
    let filters = {};
    if (req.query.status) {
      const statuses = req.query.status.split(',');
      filters.status = { $in: statuses };
    }
    
    const subscriptions = await UserSubscription.find(filters)
      .populate("userId", "username email fullName fullname avatar")
      .populate("packageId")
      .populate("paymentId")
      .sort({ createdAt: -1 });    // Process subscriptions to normalize user data
    const processedSubscriptions = subscriptions.map(sub => {
      const subscription = sub.toObject();
      
      // Normalize user data fields for consistency
      if (subscription.userId) {
        subscription.userId.fullName = subscription.userId.fullName || subscription.userId.fullname || subscription.userId.username || subscription.userId.name;
        subscription.userId.avatar = subscription.userId.avatar || subscription.userId.profilePicture || '/img/avatar.png';
      }
      
      return subscription;
    });

    return responseHelper.successResponse(
      res,
      "Lấy danh sách đăng ký thành công",
      processedSubscriptions
    );
  } catch (error) {
    console.error("Error in getAllSubscriptions:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách đăng ký"
    );
  }
};

/**
 * [ADMIN] Lấy danh sách đăng ký chờ duyệt
 */
exports.getPendingSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Lấy danh sách đăng ký chờ duyệt
    const pendingSubscriptions = await UserSubscription.find({ status: 'pending' })
      .populate('userId', 'username email fullName avatar')
      .populate('paymentId', 'amount method status')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Tổng số đăng ký chờ duyệt để tính phân trang
    const total = await UserSubscription.countDocuments({ status: 'pending' });
    
    // Xử lý thủ công việc populate packageId cho từng subscription
    const processedSubscriptions = await Promise.all(pendingSubscriptions.map(async (subscription) => {
      const subscriptionObj = subscription.toObject();
      
      // Nếu là gói thông thường, tìm và populate thông tin từ DB
      try {
        const packageDetail = await SubscriptionPackage.findById(subscriptionObj.packageId);
        if (packageDetail) {
          subscriptionObj.packageId = packageDetail;
        }
      } catch (err) {
        console.log(`Error populating package for subscription ${subscriptionObj._id}:`, err);
      }
      
      return subscriptionObj;
    }));
    
    return responseHelper.successResponse(
      res,
      "Lấy danh sách đăng ký chờ duyệt thành công",
      {
        subscriptions: processedSubscriptions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    );
  } catch (error) {
    console.error("Error in getPendingSubscriptions:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách đăng ký chờ duyệt"
    );
  }
};

/**
 * [ADMIN] Tạo gói đăng ký mới
 */
exports.createPackage = async (req, res) => {
  try {
    const { name, description, price, durationDays, features, accountTypeId, discount, isActive } = req.body;

    // Kiểm tra loại tài khoản
    const accountType = await AccountType.findById(accountTypeId);
    if (!accountType) {
      return responseHelper.notFoundResponse(
        res, 
        "Loại tài khoản không tồn tại"
      );
    }
    
    // Kiểm tra xem đã có gói với tên này chưa
    const existingPackage = await SubscriptionPackage.findOne({ name });
    if (existingPackage) {
      return responseHelper.badRequestResponse(
        res, 
        "Gói đăng ký với tên này đã tồn tại"
      );
    }

    // Tạo gói đăng ký mới
    const newPackage = new SubscriptionPackage({
      name,
      description,
      price,
      durationDays,
      features: features || [],
      accountTypeId,
      discount: discount || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await newPackage.save();

    return responseHelper.successResponse(
      res,
      "Tạo gói đăng ký mới thành công",
      newPackage
    );
  } catch (error) {
    console.error("Error in createPackage:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể tạo gói đăng ký mới"
    );
  }
};

/**
 * [ADMIN] Cập nhật gói đăng ký
 */
exports.updatePackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    const updateData = req.body;
    
    // Kiểm tra gói đăng ký tồn tại
    const packageDetail = await SubscriptionPackage.findById(packageId);
    if (!packageDetail) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký"
      );
    }

    // Kiểm tra loại tài khoản nếu có thay đổi
    if (updateData.accountTypeId) {
      const accountType = await AccountType.findById(updateData.accountTypeId);
      if (!accountType) {
        return responseHelper.notFoundResponse(
          res, 
          "Loại tài khoản không tồn tại"
        );
      }
    }

    // Kiểm tra xem đã có gói với tên mới này chưa nếu đang thay đổi tên
    if (updateData.name && updateData.name !== packageDetail.name) {
      const existingPackage = await SubscriptionPackage.findOne({ 
        name: updateData.name,
        _id: { $ne: packageId }
      });
      
      if (existingPackage) {
        return responseHelper.badRequestResponse(
          res, 
          "Gói đăng ký với tên này đã tồn tại"
        );
      }
    }

    // Cập nhật gói đăng ký
    const updatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true }
    );

    return responseHelper.successResponse(
      res,
      "Cập nhật gói đăng ký thành công",
      updatedPackage
    );
  } catch (error) {
    console.error("Error in updatePackage:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể cập nhật gói đăng ký"
    );
  }
};

/**
 * [ADMIN] Xóa gói đăng ký
 */
exports.deletePackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    
    // Kiểm tra gói đăng ký tồn tại
    const packageDetail = await SubscriptionPackage.findById(packageId);
    if (!packageDetail) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký"
      );
    }

    // Kiểm tra xem có người dùng nào đang sử dụng gói này không
    const activeSubscriptions = await UserSubscription.countDocuments({
      packageId,
      isActive: true,
      endDate: { $gt: new Date() }
    });

    if (activeSubscriptions > 0) {
      return responseHelper.badRequestResponse(
        res, 
        "Không thể xóa gói đăng ký này vì có người dùng đang sử dụng"
      );
    }

    // Xóa gói đăng ký
    await SubscriptionPackage.findByIdAndDelete(packageId);

    return responseHelper.successResponse(
      res,
      "Xóa gói đăng ký thành công",
      { deletedPackageId: packageId }
    );
  } catch (error) {
    console.error("Error in deletePackage:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể xóa gói đăng ký"
    );
  }
};

/**
 * [ADMIN] Phê duyệt đăng ký Premium
 */
exports.approveSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { notes } = req.body;
    
    console.log(`Admin approving subscription ID: ${subscriptionId}`);
    
    // Tìm đăng ký đang chờ duyệt
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      status: "pending"
    }).populate('packageId').populate('paymentId');

    if (!subscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy yêu cầu đăng ký hoặc yêu cầu không ở trạng thái chờ duyệt"
      );
    }
    
    // Lấy thông tin gói đăng ký
    const subscriptionPackage = subscription.packageId;
    if (!subscriptionPackage) {
      return responseHelper.notFoundResponse(res, "Không tìm thấy gói đăng ký");
    }
    
    // Tính ngày hết hạn
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + subscriptionPackage.durationDays);
    
    // Cập nhật đầy đủ tất cả các trường trạng thái cần thiết
    const subscriptionUpdate = {
      status: "active",
      approvalStatus: "approved", // Đảm bảo trường này được cập nhật
      isActive: true,
      startDate: startDate,
      endDate: endDate,
      approvedBy: req.user.userId,
      approvedAt: new Date(),
      notes: notes || "Approved by admin",
      paymentConfirmed: true,
      // Thêm các trường metadata khác nếu cần
      updatedAt: new Date()
    };

    // Cập nhật bản ghi đăng ký bằng findByIdAndUpdate để đảm bảo tất cả các trường được cập nhật
    const updatedSubscription = await UserSubscription.findByIdAndUpdate(
      subscriptionId,
      subscriptionUpdate,
      { new: true }
    );
    
    console.log(`Updated subscription: ${updatedSubscription._id}, status: ${updatedSubscription.status}, approvalStatus: ${updatedSubscription.approvalStatus}`);
    
    // Cập nhật chi tiết thanh toán nếu có
    if (subscription.paymentId) {
      const paymentUpdate = {
        status: "completed",
        approvalStatus: "approved", // Thêm trường này nếu model payment có
        completedAt: new Date(),
        adminConfirmed: true, 
        adminConfirmedAt: new Date(),
        adminNotes: notes || "Approved by admin",
        updatedAt: new Date()
      };
      
      // Lấy thông tin chi tiết về payment để log
      const payment = await Payment.findByIdAndUpdate(
        subscription.paymentId,
        paymentUpdate,
        { new: true }
      );
      
      console.log(`Updated payment: ${payment._id}, amount: ${payment.amount}, method: ${payment.method}, status: ${payment.status}`);
    } else {
      console.log("No payment ID associated with this subscription");
    }
    
    // Tìm role VIP từ collection Role
    const Role = require('../models/role');
    let vipRole;
    try {
      vipRole = await Role.findOne({ name: 'VIP' });
      if (!vipRole) {
        console.log('Role VIP không tồn tại, tìm role Premium');
        vipRole = await Role.findOne({ name: 'Premium' });
      }
      console.log('Tìm thấy role:', vipRole ? vipRole.name : 'Không tìm thấy role phù hợp');
    } catch (err) {
      console.error('Error finding VIP role:', err);
    }
    
    // Tìm accountType VIP hoặc Premium từ collection AccountType
    const AccountType = require('../models/accountType');
    let vipAccountType;
    try {
      vipAccountType = await AccountType.findOne({ name: 'VIP' });
      if (!vipAccountType) {
        console.log('AccountType VIP không tồn tại, tìm accountType Premium');
        vipAccountType = await AccountType.findOne({ name: 'Premium' });
      }
      console.log('Tìm thấy accountType:', vipAccountType ? vipAccountType.name : 'Không tìm thấy accountType phù hợp');
    } catch (err) {
      console.error('Error finding VIP accountType:', err);
    }
    
    // Chuẩn bị dữ liệu cập nhật cho người dùng
    const userUpdateData = { 
      isPremium: true,
      subscriptionEndDate: endDate,
      hasPremiumAccess: true, // Thêm trường này để đảm bảo người dùng có quyền Premium
      premiumStatus: "active", // Thêm trường này để theo dõi trạng thái premium
      lastUpdated: new Date()
    };
    
    // Thêm trường accountTypeId nếu tìm thấy accountType phù hợp
    if (vipAccountType) {
      userUpdateData.accountTypeId = vipAccountType._id;
    }
    
    // Thêm trường role_id nếu tìm thấy role phù hợp
    if (vipRole) {
      userUpdateData.role_id = vipRole._id;
    }
    
    console.log("Dữ liệu cập nhật cho người dùng:", userUpdateData);
    
    // Cập nhật người dùng
    const updatedUser = await User.findByIdAndUpdate(
      subscription.userId,
      userUpdateData,
      { new: true }
    ).populate('accountTypeId').populate('role_id');
    
    console.log(`Đã cập nhật người dùng: ${subscription.userId}`);
    console.log(`- isPremium: ${updatedUser.isPremium}`);
    console.log(`- accountTypeId: ${updatedUser.accountTypeId ? updatedUser.accountTypeId.name : 'Không có'}`);
    console.log(`- role_id: ${updatedUser.role_id ? updatedUser.role_id.name : 'Không có'}`);

    // Gửi thông báo thời gian thực
    try {
      const websocket = req.app.get('websocket');
      if (websocket) {
        websocket.notifyPremiumStatusChange(subscriptionId, "active", subscription.userId);
        
        // Thêm thông báo về việc cập nhật thông tin người dùng
        websocket.broadcast({
          type: 'user_updated',
          userId: subscription.userId,
          changes: {
            isPremium: true,
            accountTypeId: vipAccountType ? vipAccountType._id : undefined,
            accountTypeName: vipAccountType ? vipAccountType.name : undefined,
            role_id: vipRole ? vipRole._id : undefined,
            roleName: vipRole ? vipRole.name : undefined,
            hasPremiumAccess: true,
            premiumStatus: "active"
          }
        });
        
        // Thêm thông báo cụ thể về premium status để frontend có thể làm mới
        websocket.broadcast({
          type: 'premium_status_changed',
          userId: subscription.userId,
          status: "active",
          hasActiveSubscription: true
        });
      }
    } catch (wsErr) {
      console.error('Error sending WebSocket notification:', wsErr);
    }

    return responseHelper.successResponse(
      res,
      "Duyệt đăng ký thành công",
      { 
        subscription: updatedSubscription,
        user: updatedUser,
        status: "active",
        approvalStatus: "approved",
        success: true
      }
    );
  } catch (error) {
    console.error("Error in approveSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể duyệt yêu cầu đăng ký"
    );
  }
};

/**
 * [ADMIN] Từ chối đăng ký Premium
 */
exports.rejectSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return responseHelper.badRequestResponse(
        res, 
        "Vui lòng cung cấp lý do từ chối đăng ký"
      );
    }
    
    // Tìm đăng ký đang chờ duyệt
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      status: "pending"
    });

    if (!subscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy yêu cầu đăng ký hoặc yêu cầu không ở trạng thái chờ duyệt"
      );
    }
    
    // Cập nhật trạng thái đăng ký
    subscription.status = "rejected";
    subscription.rejectedBy = req.user.userId;
    subscription.rejectedAt = new Date();
    subscription.notes = reason;
    await subscription.save();
    
    // Cập nhật trạng thái thanh toán nếu có
    if (subscription.paymentId) {
      await Payment.findByIdAndUpdate(
        subscription.paymentId,
        { 
          status: "refunded",
          notes: `Rejected: ${reason}`
        }
      );
    }

    return responseHelper.successResponse(
      res,
      "Từ chối đăng ký thành công",
      { subscription }
    );
  } catch (error) {
    console.error("Error in rejectSubscription:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể từ chối yêu cầu đăng ký"
    );
  }
};

/**
 * Xác nhận thanh toán (người dùng bấm nút "Gửi xác nhận")
 */
exports.confirmPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentId } = req.body;

    // Tìm thanh toán cần xác nhận
    const payment = await Payment.findOne({
      _id: paymentId,
      userId,
      status: "pending"
    });

    if (!payment) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy thanh toán cần xác nhận"
      );
    }

    // Đánh dấu là đã xác nhận từ phía người dùng
    payment.userConfirmed = true;
    payment.userConfirmedAt = new Date();
    
    await payment.save();
    
    // Tìm đăng ký liên quan
    const subscription = await UserSubscription.findOne({
      paymentId: payment._id
    });
    
    if (!subscription) {
      return responseHelper.successResponse(
        res,
        "Đã xác nhận thanh toán thành công",
        { payment }
      );
    }
    
    subscription.paymentConfirmed = true;
    await subscription.save();

    return responseHelper.successResponse(
      res,
      "Đã xác nhận thanh toán và gửi yêu cầu đăng ký để duyệt",
      { payment, subscription }
    );
  } catch (error) {
    console.error("Error in confirmPayment:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể xác nhận thanh toán"
    );
  }
};

/**
 * Lấy danh sách tất cả các yêu cầu đăng ký đang chờ duyệt (chỉ dành cho Admin)
 */
exports.getAllPendingSubscriptions = async (req, res) => {
  try {
    console.log("Fetching all pending subscriptions for admin");
    
    // Tìm tất cả đăng ký chờ duyệt
    const pendingSubscriptions = await UserSubscription.find({
      status: "pending"
    })
    .populate('userId', 'username email fullName fullname avatar')
    .populate('packageId') 
    .populate('paymentId', 'amount method status userConfirmed');
    
    console.log(`Found ${pendingSubscriptions.length} pending subscriptions:`);
    pendingSubscriptions.forEach((sub, index) => {
      console.log(`[${index+1}] ID: ${sub._id}, UserId: ${sub.userId?._id || sub.userId}, PackageId: ${sub.packageId?._id || sub.packageId}`);
    });
    
    // Process subscriptions to normalize user data
    const processedSubscriptions = pendingSubscriptions.map(sub => {
      const subscription = sub.toObject();
      
      // Normalize user data fields for consistency
      if (subscription.userId) {
        subscription.userId.fullName = subscription.userId.fullName || subscription.userId.fullname || subscription.userId.username;
      }
      
      return subscription;
    });
    
    return responseHelper.successResponse(
      res,
      "Lấy danh sách yêu cầu đăng ký thành công",
      { subscriptions: processedSubscriptions }
    );
  } catch (error) {
    console.error("Error in getAllPendingSubscriptions:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể lấy danh sách yêu cầu đăng ký"
    );
  }
};

/**
 * @desc    Lấy số lượng đăng ký đang chờ duyệt (dùng cho thông báo admin)
 * @route   GET /api/subscription/admin/pending-count
 * @access  Private (Admin)
 */
exports.getAdminPendingSubscriptionsCount = async (req, res) => {
  try {
    // Đếm số lượng subscription đang ở trạng thái chờ duyệt
    const count = await UserSubscription.countDocuments({
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    console.error('Error in getAdminPendingSubscriptionsCount:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * [ADMIN] Hủy gói Premium đang hoạt động của người dùng
 */
exports.cancelSubscriptionByAdmin = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body || { reason: "Hủy bởi admin" };
    
    console.log(`Admin canceling subscription ID: ${subscriptionId}`);
    
    // Tìm đăng ký đang hoạt động
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      status: { $in: ["active", "approved"] } // Tìm các gói đang hoạt động hoặc đã được duyệt
    }).populate('userId').populate('packageId');

    if (!subscription) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy gói đăng ký hoặc gói không ở trạng thái đang hoạt động"
      );
    }
    
    // Lấy thông tin người dùng
    const userId = subscription.userId._id || subscription.userId;
    const user = await User.findById(userId);
    if (!user) {
      return responseHelper.notFoundResponse(
        res, 
        "Không tìm thấy thông tin người dùng"
      );
    }
    
    // Cập nhật trạng thái đăng ký
    const updateData = {
      status: "cancelled",
      isActive: false, // Đánh dấu không còn hoạt động
      approvalStatus: "cancelled", // Đảm bảo trường này cũng được cập nhật
      cancelledBy: req.user.userId,
      cancelledAt: new Date(),
      notes: `Hủy bởi admin: ${reason || "Không có lý do"}`,
      updatedAt: new Date()
    };
    
    // Sử dụng findByIdAndUpdate để đảm bảo tất cả trường được cập nhật
    const updatedSubscription = await UserSubscription.findByIdAndUpdate(
      subscriptionId,
      updateData,
      { new: true }
    );
    
    console.log(`Updated subscription ${subscriptionId} to status=cancelled`);
    
    // Tìm role và account type tiêu chuẩn
    const Role = require('../models/role');
    let userRole;
    try {
      userRole = await Role.findOne({ name: 'User' });
      console.log('Found standard user role:', userRole ? userRole.name : 'Role not found');
    } catch (err) {
      console.error('Error finding standard user role:', err);
    }
    
    const AccountType = require('../models/accountType');
    let normalAccountType;
    try {
      normalAccountType = await AccountType.findOne({ name: 'Normal' });
      console.log('Found normal account type:', normalAccountType ? normalAccountType.name : 'AccountType not found');
    } catch (err) {
      console.error('Error finding normal account type:', err);
    }
    
    // Chuẩn bị dữ liệu cập nhật người dùng
    const userUpdateData = { 
      isPremium: false,
      subscriptionEndDate: null,
      hasPremiumAccess: false,
      premiumStatus: null,
      lastUpdated: new Date()
    };
    
    // Thêm role tiêu chuẩn nếu tìm thấy (chỉ khi user không phải admin/moderator)
    if (userRole) {
      // Kiểm tra vai trò hiện tại của người dùng
      const currentUserWithRole = await User.findById(userId).populate('role_id');
      
      // Chỉ thay đổi role nếu không phải admin hoặc moderator
      if (!currentUserWithRole.role_id || 
          (currentUserWithRole.role_id.name !== 'Admin' && 
           currentUserWithRole.role_id.name !== 'Moderator')) {
        userUpdateData.role_id = userRole._id;
      }
    }
    
    // Thêm account type tiêu chuẩn nếu tìm thấy
    if (normalAccountType) {
      userUpdateData.accountTypeId = normalAccountType._id;
      userUpdateData.accountType = "standard";
    }
    
    console.log('User update data:', userUpdateData);
    
    // Cập nhật thông tin người dùng
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      userUpdateData,
      { new: true }
    );
    
    console.log(`Updated user ${userId} to standard account`);
    
    // Thêm thông báo WebSocket nếu có
    try {
      const websocket = req.app.get('websocket');
      if (websocket) {
        websocket.notifyPremiumStatusChange(subscriptionId, "cancelled", userId);
        
        // Thông báo cho user về việc hạ cấp tài khoản
        websocket.broadcast({
          type: 'user_updated',
          userId: userId,
          changes: {
            isPremium: false,
            hasPremiumAccess: false,
            premiumStatus: null,
            accountType: "standard",
            accountTypeId: normalAccountType ? normalAccountType._id : undefined,
            accountTypeName: normalAccountType ? normalAccountType.name : undefined,
            role_id: userRole ? userRole._id : undefined,
            roleName: userRole ? userRole.name : undefined
          }
        });
        
        // Thông báo cụ thể về việc hủy premium
        websocket.broadcast({
          type: 'premium_cancelled',
          userId: userId,
          subscriptionId: subscriptionId,
          reason: reason || "Hủy bởi quản trị viên"
        });
      }
    } catch (wsErr) {
      console.error('Error sending WebSocket notification:', wsErr);
    }
    
    return responseHelper.successResponse(
      res,
      "Hủy gói Premium thành công",
      { 
        subscription: updatedSubscription,
        user: updatedUser,
        message: "Người dùng đã bị hạ cấp xuống tài khoản tiêu chuẩn",
        success: true
      }
    );
  } catch (error) {
    console.error("Error in cancelSubscriptionByAdmin:", error);
    return responseHelper.serverErrorResponse(
      res, 
      "Không thể hủy gói Premium"
    );
  }
};