const History = require("../models/history");
const responseHelper = require("../utils/responseHelper");

// Cấu hình logging - đặt thành false để tắt tất cả các log
const DEBUG_MODE = false;

// Hàm helper để log có điều kiện
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Add history or update existing history
const addHistory = async (req, res) => {
  try {
    const { movieId, movieSlug, movieData } = req.body;
    const userId = req.user.userId;

    if (!movieSlug) {
      return responseHelper.badRequestResponse(res, "Yêu cầu slug của phim");
    }

    // Find existing history
    const existingHistory = await History.findOne({
      userId: userId,
      movieSlug: movieSlug
    });

    let savedHistory;
    if (existingHistory) {
      // Update existing history
      existingHistory.watchedAt = new Date(); // Update watch time using the correct field
      
      // Update movie data if provided
      if (movieData) {
        existingHistory.movieData = movieData;
      }
      
      savedHistory = await existingHistory.save();
    } else {
      // Create new history
      const newHistory = new History({
        userId: userId,
        movieId: movieId || null,
        movieSlug: movieSlug,
        movieData: movieData || {},
        watchedAt: new Date() // Explicitly set the watched time
      });
      savedHistory = await newHistory.save();
    }

    return responseHelper.successResponse(res, "Đã lưu lịch sử xem phim", { history: savedHistory });
  } catch (error) {
    console.error("Lỗi khi lưu lịch sử xem phim:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

// Add history by movie ID
const addHistoryByMovieId = async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const { movieSlug, movieData } = req.body;
    const userId = req.user.userId;

    if (!movieId) {
      return responseHelper.badRequestResponse(res, "Yêu cầu ID của phim");
    }

    // Find existing history
    const existingHistory = await History.findOne({
      userId: userId,
      movieId: movieId
    });

    let savedHistory;
    if (existingHistory) {
      // Update existing history
      existingHistory.watchedAt = new Date(); // Update watch time using the correct field
      
      // Update slug if provided
      if (movieSlug) {
        existingHistory.movieSlug = movieSlug;
      }
      
      // Update movie data if provided
      if (movieData) {
        existingHistory.movieData = movieData;
      }
      
      savedHistory = await existingHistory.save();
    } else {
      // Create new history
      const newHistory = new History({
        userId: userId,
        movieId: movieId,
        movieSlug: movieSlug || "",
        movieData: movieData || {},
        watchedAt: new Date() // Explicitly set the watched time
      });
      savedHistory = await newHistory.save();
    }

    return responseHelper.successResponse(res, "Đã lưu lịch sử xem phim", { history: savedHistory });
  } catch (error) {
    console.error("Lỗi khi lưu lịch sử xem phim:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

// Get user's history
const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'all';
    const sort = req.query.sort || 'newest';

    debugLog(`Getting history for user: ${userId}, filter: ${filter}, sort: ${sort}`);

    // Build query
    let query = { userId };
    
    // Apply filter by movie type if specified
    if (filter === 'movies') {
      query['movieData.type'] = 'movie';
    } else if (filter === 'series') {
      query['movieData.type'] = 'series';
    }
    
    // Determine sort order and field
    const sortOrder = sort === 'newest' ? -1 : 1;
    const sortField = { watchedAt: sortOrder }; // Sort by watchedAt field

    // Count total and get data
    const total = await History.countDocuments(query);
    debugLog(`Total history items found: ${total}`);

    const histories = await History.find(query)
      .sort(sortField)
      .skip(skip)
      .limit(limit);
      
    debugLog(`Retrieved ${histories.length} history items`);

    return responseHelper.successResponse(res, "Lấy lịch sử xem phim thành công", {
      total,
      page,
      pages: Math.ceil(total / limit),
      histories
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử xem phim:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

// Get specific user's history (for admin)
const getSpecificUserHistory = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;
    
    debugLog(`User ${currentUserId} (role: ${userRole}) is accessing history for user ${targetUserId}`);
    
    // Check access rights - only admin or the user themself can view their history
    if (targetUserId !== currentUserId && userRole !== 'admin') {
      return responseHelper.forbiddenResponse(res, "Bạn không có quyền xem lịch sử của người dùng khác");
    }
    
    // Get query parameters
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'all';
    const sort = req.query.sort || 'newest';
    
    // Build query
    let query = { userId: targetUserId };
    
    // Apply filter by movie type if specified
    if (filter === 'movies') {
      query['movieData.type'] = 'movie';
    } else if (filter === 'series') {
      query['movieData.type'] = 'series';
    }
    
    // Determine sort order and field
    const sortOrder = sort === 'newest' ? -1 : 1;
    const sortField = { watchedAt: sortOrder }; // Sort by watchedAt field
    
    debugLog(`Query: ${JSON.stringify(query)}, Sort: ${JSON.stringify(sortField)}`);
    
    // Count total and get data
    const total = await History.countDocuments(query);
    const histories = await History.find(query)
      .sort(sortField)
      .skip(skip)
      .limit(limit);

    debugLog(`Found ${total} history items, returning ${histories.length} items`);

    return responseHelper.successResponse(res, "Lấy lịch sử xem phim thành công", {
      total,
      page,
      pages: Math.ceil(total / limit),
      histories
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử xem phim của người dùng:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

// Clear all history
const clearAllHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    debugLog(`Clearing all history for user: ${userId}`);
    
    const result = await History.deleteMany({ userId });
    debugLog(`Deleted ${result.deletedCount} history items`);
    
    return responseHelper.successResponse(res, "Đã xóa toàn bộ lịch sử xem phim");
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

// Delete specific history item
const deleteHistoryItem = async (req, res) => {
  try {
    const historyId = req.params.id;
    const userId = req.user.userId;
    
    debugLog(`Deleting history item ${historyId} for user ${userId}`);
    
    const deletedHistory = await History.findOneAndDelete({
      _id: historyId,
      userId: userId
    });
    
    if (!deletedHistory) {
      debugLog(`History item not found or doesn't belong to user ${userId}`);
      return responseHelper.notFoundResponse(res, "Không tìm thấy lịch sử");
    }
    
    debugLog(`Successfully deleted history item: ${historyId}`);
    return responseHelper.successResponse(res, "Đã xóa lịch sử xem phim");
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

/**
 * Bắt đầu theo dõi phiên xem phim mới
 */
const startWatchSession = async (req, res) => {
  try {
    const { movieId, movieSlug, currentTime = 0, episode = 1 } = req.body;
    const userId = req.user.userId;

    if (!movieId) {
      return responseHelper.badRequestResponse(res, "Yêu cầu ID của phim");
    }

    debugLog(`Starting watch session for user: ${userId}, movie: ${movieId}, episode: ${episode}`);

    // Tìm lịch sử hiện có cho phim và tập này (nếu phim bộ)
    let query = { userId, movieId };
    if (episode) {
      query.episode = episode;
    }

    let history = await History.findOne(query);
    
    // Nếu không tìm thấy, tạo mới
    if (!history) {
      // Lấy thông tin phim nếu cần
      const Movie = require("../models/movie");
      const movie = await Movie.findById(movieId);
      
      if (!movie) {
        return responseHelper.notFoundResponse(res, "Không tìm thấy phim");
      }

      history = new History({
        userId,
        movieId,
        movieSlug: movieSlug || movie.slug,
        episode,
        movieData: {
          name: movie.name,
          origin_name: movie.origin_name,
          thumb_url: movie.thumb_url,
          year: movie.year,
          category: movie.category,
          duration: movie.duration,
          quality: movie.quality,
          type: movie.type
        }
      });
    }

    // Tạo phiên xem mới
    const watchSession = {
      startTime: new Date(),
      endTime: null,
      duration: 0
    };

    // Thêm phiên xem mới vào mảng
    history.watchSessions.push(watchSession);
    
    // Cập nhật vị trí xem
    history.lastPosition = currentTime;
    
    // Cập nhật thời gian xem gần nhất
    history.watchedAt = new Date();

    await history.save();

    return responseHelper.successResponse(res, "Bắt đầu theo dõi thời gian xem phim", {
      sessionId: history.watchSessions[history.watchSessions.length - 1]._id,
      history
    });
  } catch (error) {
    console.error("Lỗi khi bắt đầu theo dõi thời gian xem:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

/**
 * Kết thúc phiên xem hiện tại và cập nhật thời gian xem
 */
const endWatchSession = async (req, res) => {
  try {
    const { movieId, currentTime = 0, duration = 0, completed = false, episode = 1 } = req.body;
    const userId = req.user.userId;

    if (!movieId) {
      return responseHelper.badRequestResponse(res, "Yêu cầu ID của phim");
    }

    debugLog(`Ending watch session for user: ${userId}, movie: ${movieId}, episode: ${episode}`);

    // Tìm lịch sử hiện có cho phim và tập này (nếu phim bộ)
    let query = { userId, movieId };
    if (episode) {
      query.episode = episode;
    }

    let history = await History.findOne(query);
    
    if (!history) {
      return responseHelper.notFoundResponse(res, "Không tìm thấy lịch sử xem phim");
    }

    // Tìm phiên xem cuối cùng chưa kết thúc
    const watchSessions = history.watchSessions || [];
    const lastSessionIndex = watchSessions.findIndex(
      session => !session.endTime
    );

    if (lastSessionIndex >= 0) {
      // Cập nhật phiên xem cuối
      const now = new Date();
      const startTime = new Date(watchSessions[lastSessionIndex].startTime);
      
      // Tính toán thời gian xem (giây)
      let sessionDuration = Math.floor((now - startTime) / 1000);
      
      // Giới hạn thời gian tối đa (24 giờ) để tránh lỗi nếu không kết thúc phiên đúng cách
      sessionDuration = Math.min(sessionDuration, 86400);
      
      // Cập nhật phiên xem
      watchSessions[lastSessionIndex].endTime = now;
      watchSessions[lastSessionIndex].duration = sessionDuration;
      
      // Cập nhật tổng thời gian xem
      history.watchDuration = (history.watchDuration || 0) + sessionDuration;
    }

    // Cập nhật vị trí cuối và trạng thái hoàn thành
    history.lastPosition = currentTime;
    
    // Đánh dấu đã hoàn thành nếu xem hết hoặc đạt >80% thời lượng
    if (completed || (duration > 0 && currentTime >= duration * 0.8)) {
      history.completed = true;
    }
    
    // Cập nhật thời gian xem gần nhất
    history.watchedAt = new Date();

    await history.save();

    return responseHelper.successResponse(res, "Kết thúc theo dõi thời gian xem phim", {
      history
    });
  } catch (error) {
    console.error("Lỗi khi kết thúc theo dõi thời gian xem:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

/**
 * Cập nhật vị trí xem hiện tại mà không kết thúc phiên
 */
const updateWatchPosition = async (req, res) => {
  try {
    const { movieId, currentTime, episode = 1 } = req.body;
    const userId = req.user.userId;

    if (!movieId || currentTime === undefined) {
      return responseHelper.badRequestResponse(res, "Yêu cầu ID phim và vị trí hiện tại");
    }

    // Tìm lịch sử hiện có cho phim và tập
    let query = { userId, movieId };
    if (episode) {
      query.episode = episode;
    }

    let history = await History.findOne(query);
    
    if (!history) {
      return responseHelper.notFoundResponse(res, "Không tìm thấy lịch sử xem phim");
    }

    // Cập nhật vị trí xem
    history.lastPosition = currentTime;
    
    // Cập nhật thời gian xem gần nhất
    history.watchedAt = new Date();

    await history.save();

    return responseHelper.successResponse(res, "Đã cập nhật vị trí xem phim", {
      lastPosition: history.lastPosition
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật vị trí xem:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

/**
 * Lấy tổng thời gian xem phim của người dùng
 */
const getTotalWatchTime = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mongoose = require('mongoose');

    // Tính tổng thời gian xem từ tất cả lịch sử
    const result = await History.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: {
          _id: null,
          totalWatchTime: { $sum: "$watchDuration" },
          totalMovies: { $sum: { $cond: [{ $eq: ["$movieData.type", "movie"] }, 1, 0] } },
          totalSeries: { $sum: { $cond: [{ $eq: ["$movieData.type", "series"] }, 1, 0] } },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } }
        }
      }
    ]);

    // Xử lý kết quả
    const watchStats = result.length > 0 ? result[0] : {
      totalWatchTime: 0,
      totalMovies: 0,
      totalSeries: 0,
      totalCompleted: 0
    };
    
    // Tính giờ và phút từ giây một cách chính xác
    const totalSeconds = watchStats.totalWatchTime || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // Tạo chuỗi thời gian đẹp hơn
    let formattedTime = '';
    if (hours > 0) {
      formattedTime += `${hours} giờ `;
    }
    if (minutes > 0 || hours > 0) {
      formattedTime += `${minutes} phút `;
    }
    formattedTime += `${seconds} giây`;

    return responseHelper.successResponse(res, "Lấy tổng thời gian xem phim thành công", {
      totalWatchTimeSeconds: totalSeconds,
      totalWatchTimeFormatted: formattedTime.trim(),
      totalWatchTimeHours: hours,
      totalWatchTimeMinutes: minutes,
      totalSeconds: seconds,
      totalMoviesWatched: watchStats.totalMovies,
      totalSeriesWatched: watchStats.totalSeries,
      totalMoviesCompleted: watchStats.totalCompleted
    });
  } catch (error) {
    console.error("Lỗi khi lấy tổng thời gian xem phim:", error);
    return responseHelper.serverErrorResponse(res, "Lỗi server: " + error.message);
  }
};

module.exports = {
  addHistory,
  addHistoryByMovieId,
  getUserHistory,
  getSpecificUserHistory,
  clearAllHistory,
  deleteHistoryItem,
  startWatchSession,
  endWatchSession,
  updateWatchPosition,
  getTotalWatchTime
};