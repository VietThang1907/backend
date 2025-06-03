const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { verifyToken, isAuthenticated } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { body, validationResult } = require('express-validator');

// Middleware xử lý kết quả validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: errors.array()
    });
  }
  next();
};

// Định nghĩa các validation middleware
const validateSubscribe = [
  body('packageId').notEmpty().withMessage('ID gói đăng ký không được để trống'),
  body('paymentMethod').isIn(['credit_card', 'bank_transfer', 'e_wallet', 'momo', 'zalopay']).withMessage('Phương thức thanh toán không hợp lệ')
];

const validateCreatePackage = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Tên gói phải từ 2 đến 50 ký tự'),
  body('description').trim().isLength({ min: 10 }).withMessage('Mô tả phải có ít nhất 10 ký tự'),
  body('price').isNumeric().withMessage('Giá phải là số').isFloat({ min: 0 }).withMessage('Giá không được âm'),
  body('durationDays').isInt({ min: 1 }).withMessage('Thời hạn phải là số nguyên dương'),
  body('accountTypeId').isMongoId().withMessage('ID loại tài khoản không hợp lệ')
];

// ===== PUBLIC ROUTES =====
// Lấy danh sách gói đăng ký có sẵn
router.get('/packages', (req, res) => {
  subscriptionController.getAllPackages(req, res);
});

// Lấy chi tiết một gói đăng ký
router.get('/packages/:id', (req, res) => {
  subscriptionController.getPackageById(req, res);
});

// ===== USER ROUTES (Yêu cầu đăng nhập) =====
// Đăng ký gói premium
router.post('/subscribe', 
  verifyToken,
  (req, res, next) => {
    // Debug middleware to log request details
    console.log('=== SUBSCRIPTION DEBUG ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('User from token:', req.user);
    console.log('=== END DEBUG ===');
    next();
  },
  validateSubscribe,
  validate,
  (req, res) => {
    subscriptionController.subscribePackage(req, res);
  }
);

// Direct test endpoint to bypass validation
router.post('/test-subscribe', 
  verifyToken,
  (req, res) => {
    try {
      console.log("=== TEST SUBSCRIPTION ===");
      // Extract data directly from request
      const { packageId, paymentMethod } = req.body;
      const userId = req.user.userId || req.user._id;
      
      console.log("User ID:", userId);
      console.log("Package ID:", packageId);
      console.log("Payment Method:", paymentMethod);
      
      // Return success for testing
      return res.status(200).json({ 
        success: true, 
        message: "Test subscription endpoint successful",
        data: {
          userId,
          packageId,
          paymentMethod,
          userInfo: req.user
        }
      });
    } catch (error) {
      console.error("Test subscription error:", error);
      return res.status(500).json({
        success: false,
        message: "Test subscription failed",
        error: error.message
      });
    }
  }
);

// Xác nhận thanh toán
router.post('/confirm-payment', 
  verifyToken, 
  (req, res) => {
    subscriptionController.confirmPayment(req, res);
  }
);

// Hủy đăng ký gói premium
router.post('/cancel', 
  verifyToken, 
  (req, res) => {
    subscriptionController.cancelSubscription(req, res);
  }
);

// Xem thông tin gói đăng ký hiện tại
router.get('/current', 
  verifyToken, 
  (req, res) => {
    subscriptionController.getCurrentSubscription(req, res);
  }
);

// Lấy thông tin về quyền lợi ẩn quảng cáo dựa trên gói đăng ký
router.get('/ad-benefits', 
  verifyToken, 
  (req, res) => {
    try {
      // Import controller properly to ensure it's loaded correctly
      const adBenefitsController = require('../controllers/adBenefitsController');
      
      // Check if user object exists and log properly
      const userId = req.user ? (req.user._id || req.user.userId || req.user.id) : 'undefined';
      console.log('[Route] Calling ad-benefits endpoint for user:', userId);
      
      // Pass to controller - it will handle authentication validation
      adBenefitsController.getAdBenefits(req, res);
    } catch (error) {
      console.error('[Route] Error in ad-benefits endpoint:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error when checking ad benefits'
      });
    }
  }
);

// Lấy lịch sử đăng ký
router.get('/history', 
  verifyToken, 
  (req, res) => {
    subscriptionController.getSubscriptionHistory(req, res);
  }
);

// Cập nhật tự động gia hạn
router.put('/auto-renewal', 
  verifyToken, 
  (req, res) => {
    subscriptionController.updateAutoRenewal(req, res);
  }
);

// Lấy thông tin đăng ký đang chờ duyệt của người dùng hiện tại
router.get('/pending', 
  isAuthenticated, 
  (req, res) => {
    subscriptionController.getPendingSubscription(req, res);
  }
);

// Hủy yêu cầu đăng ký đang chờ duyệt
router.post('/cancel-pending', 
  isAuthenticated, 
  (req, res) => {
    subscriptionController.cancelPendingSubscription(req, res);
  }
);

// Thêm route kiểm tra gói đăng ký hết hạn
router.get('/check-expired', isAuthenticated, (req, res) => {
  subscriptionController.checkCurrentUserExpiredSubscription(req, res);
});

// ===== ADMIN ROUTES =====
// [ADMIN] Tạo gói đăng ký mới
router.post('/admin/packages', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  validateCreatePackage,
  validate,
  (req, res) => {
    subscriptionController.createPackage(req, res);
  }
);

// [ADMIN] Cập nhật gói đăng ký
router.put('/admin/packages/:id', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.updatePackage(req, res);
  }
);

// [ADMIN] Xóa gói đăng ký
router.delete('/admin/packages/:id', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.deletePackage(req, res);
  }
);

// [ADMIN] Lấy danh sách tất cả đăng ký người dùng
router.get('/admin/subscriptions', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.getAllSubscriptions(req, res);
  }
);

// [ADMIN] Lấy danh sách tất cả đăng ký người dùng chờ duyệt
router.get('/admin/pending-subscriptions', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.getAllPendingSubscriptions(req, res);
  }
);

// [ADMIN] Lấy số lượng đăng ký đang chờ duyệt
router.get('/admin/pending-count', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.getAdminPendingSubscriptionsCount(req, res);
  }
);

// [ADMIN] Phê duyệt đăng ký Premium
router.post('/admin/approve/:subscriptionId', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.approveSubscription(req, res);
  }
);

// [ADMIN] Từ chối đăng ký Premium
router.post('/admin/reject/:subscriptionId', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.rejectSubscription(req, res);
  }
);

// [ADMIN] Hủy gói Premium đang hoạt động của người dùng
router.post('/admin/cancel/:subscriptionId', 
  isAuthenticated, 
  adminMiddleware.isAdmin,
  (req, res) => {
    subscriptionController.cancelSubscriptionByAdmin(req, res);
  }
);

// Route cho admin để kiểm tra các gói hết hạn thủ công
router.get('/admin/expired/check', isAuthenticated, adminMiddleware.isAdmin, (req, res) => {
  // Gọi script kiểm tra hết hạn từ controller
  const { exec } = require('child_process');
  const path = require('path');
  
  // Đường dẫn tới script kiểm tra
  const scriptPath = path.join(__dirname, '../../scripts/checkExpiredSubscriptions.js');
  
  console.log(`Running expired subscription check script: ${scriptPath}`);
  
  // Chạy script kiểm tra subscription hết hạn
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error checking expired subscriptions',
        error: error.message
      });
    }
    
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
    }
    
    console.log(`Script output: ${stdout}`);
    
    return res.status(200).json({
      success: true,
      message: 'Expired subscription check completed',
      output: stdout
    });
  });
});

module.exports = router;