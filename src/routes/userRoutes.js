// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// Import controller và middlewares
const userController = require('../controllers/userController'); 
const accountStatusController = require('../controllers/accountStatusController'); // Sửa tham chiếu đến controller mới
const { isAuthenticated } = require('../middlewares/authMiddleware'); // Middleware xác thực token
const { hasPermission } = require('../middlewares/permissionMiddleware'); // Middleware kiểm tra quyền
const { PERMISSIONS } = require('../constants/roles'); // Import các quyền đã định nghĩa

// --- Định nghĩa Route Lấy Danh sách User ---
// GET / (Khi được mount với prefix /api/users trong server.js, nó sẽ thành GET /api/users)
router.get(
  '/', // Đường dẫn gốc của router này
  isAuthenticated, // 1. Yêu cầu user phải đăng nhập (có token hợp lệ)
  hasPermission(PERMISSIONS.USER_MANAGEMENT.READ_USER), // 2. Yêu cầu user phải có quyền 'read_user'
  userController.getAllUsersForAdmin // 3. Gọi hàm controller để xử lý
);

// Route kiểm tra trạng thái tài khoản
router.get(
  '/account/status',
  isAuthenticated, // Chỉ yêu cầu người dùng đăng nhập, không cần quyền đặc biệt
  accountStatusController.checkAccountStatus // Sử dụng controller với tên mới
);

// --- Định nghĩa các route khác cho user tại đây ---
// Ví dụ: Lấy chi tiết user theo ID
// router.get('/:userId', isAuthenticated, hasPermission(PERMISSIONS.USER_MANAGEMENT.READ_USER), userController.getUserById);
// Ví dụ: Cập nhật user bởi admin
// router.put('/:userId', isAuthenticated, hasPermission(PERMISSIONS.USER_MANAGEMENT.UPDATE_USER), userController.updateUserByAdmin);
// Ví dụ: Xóa user
// router.delete('/:userId', isAuthenticated, hasPermission(PERMISSIONS.USER_MANAGEMENT.DELETE_USER), userController.deleteUserById);


module.exports = router; // Export router