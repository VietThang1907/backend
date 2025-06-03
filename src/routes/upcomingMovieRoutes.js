// routes/upcomingMovieRoutes.js

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const upcomingMovieController = require('../controllers/upcomingMovieController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Middleware xác thực cho tất cả các routes
router.use(isAuthenticated);

/**
 * @route   GET /api/admin/upcoming-movies
 * @desc    Lấy danh sách tất cả phim sắp ra mắt với phân trang
 * @access  Public
 */
router.get('/', upcomingMovieController.getAllUpcomingMovies);

/**
 * @route   GET /api/admin/upcoming-movies/:id
 * @desc    Lấy thông tin chi tiết phim sắp ra mắt theo ID
 * @access  Public
 */
router.get('/:id', upcomingMovieController.getUpcomingMovieById);

/**
 * @route   POST /api/admin/upcoming-movies
 * @desc    Tạo phim sắp ra mắt mới
 * @access  Private (admin)
 */
router.post('/', [
  check('name', 'Tên phim là bắt buộc').not().isEmpty(),
  check('origin_name', 'Tên gốc là bắt buộc').not().isEmpty(),
  check('release_date', 'Ngày phát hành là bắt buộc').not().isEmpty(),
  check('year', 'Năm sản xuất là bắt buộc').isNumeric(),
], upcomingMovieController.createUpcomingMovie);

/**
 * @route   PUT /api/admin/upcoming-movies/:id
 * @desc    Cập nhật thông tin phim sắp ra mắt
 * @access  Private (admin)
 */
router.put('/:id', upcomingMovieController.updateUpcomingMovie);

/**
 * @route   DELETE /api/admin/upcoming-movies/:id
 * @desc    Xóa phim sắp ra mắt
 * @access  Private (admin)
 */
router.delete('/:id', upcomingMovieController.deleteUpcomingMovie);

/**
 * @route   PUT /api/admin/upcoming-movies/:id/release
 * @desc    Chuyển phim sắp ra mắt thành phim đã phát hành
 * @access  Private (admin)
 */
router.put('/:id/release', upcomingMovieController.releaseMovie);

// Xuất router
module.exports = router;