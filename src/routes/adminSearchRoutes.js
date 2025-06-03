// src/routes/adminSearchRoutes.js

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');
const adminSearchController = require('../controllers/adminSearchController');

// Bảo vệ tất cả các routes trong admin với middleware xác thực và phân quyền
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * GET /admin/search/movies
 * Tìm kiếm phim bằng Elasticsearch cho admin panel
 */
router.get('/search/movies', adminSearchController.searchMoviesForAdmin);

/**
 * GET /admin/search/status
 * Kiểm tra trạng thái của Elasticsearch
 */
router.get('/search/status', adminSearchController.checkElasticsearchStatus);

module.exports = router;