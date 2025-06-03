// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHelper');

// Route để người dùng tạo báo cáo mới (cần đăng nhập)
router.post('/', authMiddleware.isAuthenticated, reportController.createReport);

// Route đặc biệt để báo lỗi phim
router.post('/movie', authMiddleware.isAuthenticated, reportController.reportMovie);

// Route để người dùng xem báo cáo của họ
router.get('/my-reports', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const reports = await Report.find({ userId })
      .sort({ createdAt: -1 });
    
    sendSuccessResponse(res, reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    sendErrorResponse(res, 500, 'Lỗi khi lấy báo cáo của người dùng', error);
  }
});

module.exports = router;