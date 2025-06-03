const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Apply authentication middleware to all dashboard routes
router.use(authMiddleware.isAuthenticated);
router.use(adminMiddleware.isAdmin);

// Dashboard stats routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-movies', dashboardController.getRecentMovies);
router.get('/top-movies', dashboardController.getTopMovies);
router.get('/views-by-day', dashboardController.getViewsByDay);
router.get('/genre-distribution', dashboardController.getGenreDistribution);

// Thêm endpoint mới cho feedback
router.get('/recent-feedbacks', dashboardController.getRecentFeedbacks);
router.get('/feedback-stats', dashboardController.getFeedbackStats);

// Thêm endpoint mới cho analytics
router.get('/analytics', dashboardController.getAnalyticsData);

module.exports = router;