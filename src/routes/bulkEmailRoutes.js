// src/routes/bulkEmailRoutes.js
const express = require('express');
const router = express.Router();
const bulkEmailController = require('../controllers/bulkEmailController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Áp dụng middleware xác thực và quyền admin cho tất cả các routes
router.use(authMiddleware.isAuthenticated);
router.use(adminMiddleware.isAdmin);

// Route gửi thông báo hàng loạt đến người dùng
router.post('/send-bulk', bulkEmailController.sendBulkNotification);

// Route gửi thông báo đến các người dùng được chọn theo ID
router.post('/send-to-users', bulkEmailController.sendToSelectedUsers);

module.exports = router;
