const express = require('express');
const router = express.Router();
const searchHistoryController = require('../controllers/searchHistoryController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Tất cả các route đều cần xác thực user
router.use(isAuthenticated);

// Lưu lịch sử tìm kiếm mới
router.post('/', searchHistoryController.saveSearchHistory);

// Lấy lịch sử tìm kiếm của người dùng hiện tại
router.get('/', searchHistoryController.getUserSearchHistory);

// Xóa một mục trong lịch sử tìm kiếm
router.delete('/:id', searchHistoryController.deleteSearchHistoryItem);

// Xóa toàn bộ lịch sử tìm kiếm
router.delete('/', searchHistoryController.clearSearchHistory);

module.exports = router;