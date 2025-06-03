// routes/publicUpcomingMovieRoutes.js

const express = require('express');
const router = express.Router();
const UpcomingMovie = require('../models/upcomingMovie');

/**
 * @route   GET /api/upcoming-movies
 * @desc    Lấy danh sách phim sắp ra mắt (endpoint công khai)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Các thông số phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Lọc chỉ hiển thị phim chưa ẩn
    const filter = { isHidden: false };
    
    // Mặc định sắp xếp theo ngày phát hành
    const sortField = req.query.sortField || 'release_date';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    
    // Đếm tổng số phim thỏa mãn điều kiện
    const totalCount = await UpcomingMovie.countDocuments(filter);
    
    // Lấy danh sách phim có phân trang
    const upcomingMovies = await UpcomingMovie.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      pageSize: limit,
      upcomingMovies
    });
  } catch (err) {
    console.error('Error fetching upcoming movies:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách phim sắp ra mắt' });
  }
});

/**
 * @route   GET /api/upcoming-movies/:id
 * @desc    Lấy thông tin chi tiết phim sắp ra mắt theo ID (endpoint công khai)
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const upcomingMovie = await UpcomingMovie.findOne({
      _id: req.params.id,
      isHidden: false
    });
    
    if (!upcomingMovie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim sắp ra mắt' });
    }
    
    res.status(200).json({ success: true, upcomingMovie });
  } catch (err) {
    console.error('Error fetching upcoming movie details:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin phim sắp ra mắt' });
  }
});

// Xuất router
module.exports = router;
