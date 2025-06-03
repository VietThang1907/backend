// src/routes/userStatsRoutes.js

const express = require('express');
const router = express.Router();
const userStatsController = require('../controllers/userStatsController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các route
router.use(isAuthenticated);

// Lấy thống kê xem phim của người dùng
router.get('/watch-stats', userStatsController.getUserWatchStats);

// Lấy hoạt động xem phim trong tuần
router.get('/weekly-activity', userStatsController.getUserWeeklyActivity);

// Lấy phân bố thể loại phim đã xem
router.get('/genre-distribution', userStatsController.getUserGenreDistribution);

// Lấy thời gian xem phim theo ngày
router.get('/daily-viewing-time', userStatsController.getUserDailyViewingTime);

// Lấy tiến độ xem series cụ thể
router.get('/series-progress/:seriesId', userStatsController.getUserSeriesProgress);

// Lấy danh sách series đang xem
router.get('/in-progress-series', userStatsController.getUserInProgressSeries);

// Lấy thành tựu xem phim
router.get('/achievements', userStatsController.getUserAchievements);

module.exports = router;