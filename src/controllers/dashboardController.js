// src/controllers/dashboardController.js

const User = require('../models/user');
const Movie = require('../models/movie');
const Comment = require('../models/comment');
const MovieView = require('../models/movieView');
const History = require('../models/history');
const Rating = require('../models/rating');
const Feedback = require('../models/feedback'); // Thêm import model Feedback
const responseHelper = require('../utils/responseHelper');

/**
 * Lấy thống kê tổng quan cho dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Đếm tổng số users
    const totalUsers = await User.countDocuments();
    
    // Đếm số user mới trong 7 ngày qua
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Sửa lỗi: Đảm bảo truy vấn createdAt đúng định dạng và có dữ liệu
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: lastWeek } 
    });
    
    console.log(`Debug - Số người dùng mới trong 7 ngày qua: ${newUsers}`);
    console.log(`Debug - Từ ngày: ${lastWeek.toISOString()}`);
    
    // Đếm tổng số phim
    const totalMovies = await Movie.countDocuments();
    
    // Đếm tổng số bình luận
    const totalComments = await Comment.countDocuments();
      // Đếm tổng số lượt xem
    const totalViews = await MovieView.countDocuments();
    
    // Đếm số lượt xem trong 1 tuần gần đây (để tính engagement rate)
    const recentViews = await MovieView.countDocuments({
      createdAt: { $gte: lastWeek }
    });
    
    // Đếm số lượt báo cáo (comments có isReported = true)
    const reportedComments = await Comment.countDocuments({ isReported: true });
    
    // Đếm tổng số feedback và số feedback chưa đọc
    const totalFeedbacks = await Feedback.countDocuments();
    const unreadFeedbacks = await Feedback.countDocuments({ isRead: false });
      // Tính trung bình số lượt xem của 1 user trong 1 tuần
    let engagementRate = '0.00';
    if (totalUsers > 0) {
      // Tính trung bình lượt xem mỗi người dùng trong tuần qua
      const rate = recentViews / totalUsers;
      engagementRate = Math.round(rate) 
    }

    // Tạo response data
    const statsData = {
      totalMovies,
      engagementRate,
      newUsers, // Đảm bảo giá trị này được trả về đúng
      reports: reportedComments,
      feedback: {
        total: totalFeedbacks,
        unread: unreadFeedbacks
      },
      counts: {
        users: totalUsers,
        movies: totalMovies,
        comments: totalComments,
        views: totalViews
      },
      // Thêm các thống kê khác nếu cần
    };

    return responseHelper.successResponse(res, 'Dashboard statistics retrieved successfully', statsData);
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve dashboard statistics');
  }
};

/**
 * Lấy dữ liệu phim mới thêm gần đây
 */
exports.getRecentMovies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const recentMovies = await Movie.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name origin_name year thumb_url createdAt');
      
    return responseHelper.successResponse(res, 'Recent movies retrieved successfully', {
      recentMovies
    });
  } catch (error) {
    console.error('Error in getRecentMovies:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve recent movies');
  }
};

/**
 * Lấy danh sách phim xem nhiều nhất
 */
exports.getTopMovies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Aggregate để lấy phim có nhiều lượt xem nhất
    const topMovies = await MovieView.aggregate([
      { $group: { _id: '$movie_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { 
        $lookup: {
          from: 'movies', 
          localField: '_id',
          foreignField: '_id',
          as: 'movieDetails'
        }
      },
      { $unwind: '$movieDetails' },
      { 
        $project: {
          _id: 1,
          viewCount: '$count',
          name: '$movieDetails.name',
          origin_name: '$movieDetails.origin_name',
          year: '$movieDetails.year',
          thumb_url: '$movieDetails.thumb_url'
        }
      }
    ]);
    
    return responseHelper.successResponse(res, 'Top movies retrieved successfully', {
      topMovies
    });
  } catch (error) {
    console.error('Error in getTopMovies:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve top movies');
  }
};

/**
 * Lấy thống kê lượt xem theo ngày trong tuần qua
 */
exports.getViewsByDay = async (req, res) => {
  try {
    // Lấy dữ liệu 7 ngày gần nhất
    const days = 7;
    const viewsData = [];
    const labels = [];
    
    // Tạo mảng các ngày
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Đặt giờ, phút, giây về 00:00:00
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      // Đặt giờ, phút, giây về 23:59:59
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Định dạng ngày thành chuỗi
      const dayLabel = date.toLocaleDateString('vi-VN', { weekday: 'short' });
      labels.push(dayLabel);
      
      // Đếm lượt xem trong ngày
      const viewCount = await MovieView.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      viewsData.push(viewCount);
    }
    
    return responseHelper.successResponse(res, 'Views by day retrieved successfully', {
      labels,
      data: viewsData
    });
  } catch (error) {
    console.error('Error in getViewsByDay:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve views by day');
  }
};

/**
 * Lấy thống kê phân bố theo thể loại phim
 */
exports.getGenreDistribution = async (req, res) => {
  try {
    // Aggregate để đếm phim theo thể loại
    const genreDistribution = await Movie.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const labels = genreDistribution.map(item => item._id);
    const data = genreDistribution.map(item => item.count);
    
    return responseHelper.successResponse(res, 'Genre distribution retrieved successfully', {
      labels,
      data
    });
  } catch (error) {
    console.error('Error in getGenreDistribution:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve genre distribution');
  }
};

/**
 * Lấy feedback gần đây nhất
 */
exports.getRecentFeedbacks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const recentFeedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name email subject type status isRead createdAt');
      
    return responseHelper.successResponse(res, 'Recent feedbacks retrieved successfully', {
      recentFeedbacks
    });
  } catch (error) {
    console.error('Error in getRecentFeedbacks:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve recent feedbacks');
  }
};

/**
 * Lấy thống kê feedback theo loại
 */
exports.getFeedbackStats = async (req, res) => {
  try {
    // Aggregate để đếm feedback theo type
    const feedbackByType = await Feedback.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Aggregate để đếm feedback theo status
    const feedbackByStatus = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Thống kê theo ngày (7 ngày gần nhất)
    const days = 7;
    const feedbackByDay = [];
    const labels = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const dayLabel = date.toLocaleDateString('vi-VN', { weekday: 'short' });
      labels.push(dayLabel);
      
      const feedbackCount = await Feedback.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      feedbackByDay.push(feedbackCount);
    }
    
    return responseHelper.successResponse(res, 'Feedback stats retrieved successfully', {
      byType: feedbackByType,
      byStatus: feedbackByStatus,
      byDay: {
        labels,
        data: feedbackByDay
      }
    });
  } catch (error) {
    console.error('Error in getFeedbackStats:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve feedback stats');
  }
};

/**
 * Lấy dữ liệu thống kê tổng hợp cho trang analytics
 * Kết hợp dữ liệu từ nhiều nguồn để có bộ dữ liệu đầy đủ cho trang analytics
 */
exports.getAnalyticsData = async (req, res) => {
  try {
    // Lấy thống kê chung
    const totalUsers = await User.countDocuments();
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsers = await User.countDocuments({ createdAt: { $gte: lastWeek } });
    const totalMovies = await Movie.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalViews = await MovieView.countDocuments();
    const reportedComments = await Comment.countDocuments({ isReported: true });
    const totalFeedbacks = await Feedback.countDocuments();
    const unreadFeedbacks = await Feedback.countDocuments({ isRead: false });    // Đếm số lượt xem trong 1 tuần gần đây (để tính engagement rate)
    const recentViewsForAnalytics = await MovieView.countDocuments({
      createdAt: { $gte: lastWeek }
    });
    
    // Tính trung bình số lượt xem của 1 user trong 1 tuần
    const engagementRate = totalUsers > 0 
      ? (recentViewsForAnalytics / totalUsers).toFixed(2)
      : '0.00';

    // Lấy dữ liệu lượt xem theo ngày
    const days = 7;
    const viewsData = [];
    const viewsLabels = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const dayLabel = date.toLocaleDateString('vi-VN', { weekday: 'short' });
      viewsLabels.push(dayLabel);
      
      const viewCount = await MovieView.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      viewsData.push(viewCount);
    }

    // Lấy dữ liệu phân bố thể loại
    const genreDistribution = await Movie.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const genreLabels = genreDistribution.map(item => item._id);
    const genreData = genreDistribution.map(item => item.count);

    // Lấy phim gần đây
    const recentMovies = await Movie.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name origin_name year thumb_url createdAt');

    // Lấy phim xem nhiều nhất
    const topMovies = await MovieView.aggregate([
      { $group: { _id: '$movie_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { 
        $lookup: {
          from: 'movies', 
          localField: '_id',
          foreignField: '_id',
          as: 'movieDetails'
        }
      },
      { $unwind: '$movieDetails' },
      { 
        $project: {
          _id: 1,
          viewCount: '$count',
          name: '$movieDetails.name',
          origin_name: '$movieDetails.origin_name',
          year: '$movieDetails.year',
          thumb_url: '$movieDetails.thumb_url'
        }
      }
    ]);

    // Lấy feedback gần đây
    const recentFeedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email subject type status isRead createdAt');
    
    // Thêm thống kê feedback theo loại
    const feedbackByType = await Feedback.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Thêm thống kê feedback theo trạng thái
    const feedbackByStatus = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Tổng hợp dữ liệu analytics
    const analyticsData = {
      // Thống kê cơ bản
      stats: {
        totalMovies,
        engagementRate,
        newUsers,
        reports: reportedComments,
        feedback: {
          total: totalFeedbacks,
          unread: unreadFeedbacks
        },
        counts: {
          users: totalUsers,
          movies: totalMovies,
          comments: totalComments,
          views: totalViews
        }
      },
      // Dữ liệu lượt xem theo ngày
      viewsByDay: {
        labels: viewsLabels,
        data: viewsData
      },
      // Dữ liệu phân bố thể loại
      genreDistribution: {
        labels: genreLabels,
        data: genreData
      },
      // Danh sách phim gần đây
      recentMovies: recentMovies,
      // Top phim xem nhiều
      topMovies: topMovies,
      // Thêm dữ liệu feedback
      feedback: {
        recent: recentFeedbacks,
        byType: feedbackByType,
        byStatus: feedbackByStatus
      }
    };

    return responseHelper.successResponse(res, 'Analytics data retrieved successfully', analyticsData);
  } catch (error) {
    console.error('Error in getAnalyticsData:', error);
    return responseHelper.serverErrorResponse(res, 'Failed to retrieve analytics data');
  }
};