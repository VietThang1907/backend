const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { body } = require('express-validator');

// Validation middlewares
const validateFeedback = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống'),
  body('email').trim().isEmail().withMessage('Email không hợp lệ'),
  body('message').trim().notEmpty().withMessage('Nội dung không được để trống')
];

// Người dùng gửi feedback
router.post('/', validateFeedback, feedbackController.submitFeedback);

// --- ADMIN ROUTES ---

// Lấy tất cả feedback (phân trang, lọc, tìm kiếm) - chỉ dành cho admin
router.get('/', verifyToken, isAdmin, feedbackController.getAllFeedback);

// Lấy thống kê tổng quan - chỉ dành cho admin
router.get('/stats', verifyToken, isAdmin, feedbackController.getFeedbackStats);

// Lấy chi tiết một feedback - chỉ dành cho admin
router.get('/:id', verifyToken, isAdmin, feedbackController.getFeedbackById);

// Cập nhật trạng thái feedback - chỉ dành cho admin
router.patch('/:id', verifyToken, isAdmin, feedbackController.updateFeedbackStatus);

// Xóa feedback - chỉ dành cho admin
router.delete('/:id', verifyToken, isAdmin, feedbackController.deleteFeedback);

module.exports = router;