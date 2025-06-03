// src/controllers/userStatsController.js

const History = require('../models/history');
const MovieView = require('../models/movieView');
const Movie = require('../models/movie');
const User = require('../models/user');
const Favorite = require('../models/favoritesList');
const Watchlist = require('../models/watchlist');
const responseHelper = require('../utils/responseHelper');
const mongoose = require('mongoose');

/**
 * Hàm tạo đầu tuần (bắt đầu từ Chủ Nhật)
 * @param {Date} date - Ngày cần lấy đầu tuần
 * @returns {Date} - Ngày đầu tuần
 */
const getStartOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay(); // 0 = Chủ Nhật, 1-6 = Thứ 2-7
  result.setDate(result.getDate() - day); // Lùi về Chủ Nhật
  result.setHours(0, 0, 0, 0); // Đặt thời gian về 00:00:00
  return result;
};

/**
 * Hàm tạo ngày trước đó n ngày
 * @param {Date} date - Ngày cơ sở
 * @param {number} days - Số ngày cần lùi
 * @returns {Date} - Ngày kết quả
 */
const subDaysFromDate = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

/**
 * Hàm tạo đầu ngày (00:00:00)
 * @param {Date} date - Ngày cần xử lý
 * @returns {Date} - Ngày với thời gian 00:00:00
 */
const getStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Lấy thống kê xem phim của người dùng
 */
exports.getUserWatchStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Lấy lịch sử xem phim
    const history = await History.find({ userId })
      .populate('movieId', 'name origin_name type duration category episodes')
      .sort({ updatedAt: -1 });
      
    // Đếm số lượng phim và series đã xem
    const moviesWatched = new Set();
    const seriesWatched = new Set();
    const categories = new Set();
    let totalWatchTimeSeconds = 0;
    let seriesCompleted = 0;
    
    // Tính toán thời gian xem và thống kê thể loại
    const genreCounts = {};
    
    history.forEach(item => {
      if (!item.movieId) return;
      
      // Đếm phim đã xem (loại bỏ trùng lặp)
      if (item.movieId.type === 'movie') {
        moviesWatched.add(item.movieId._id.toString());
      } else {
        seriesWatched.add(item.movieId._id.toString());
      }
      
      // Tính tổng thời gian xem (lưu ở seconds)
      const watchDuration = item.watchDuration || 0;
      totalWatchTimeSeconds += watchDuration;
      
      // Đếm series đã hoàn thành
      if (item.movieId.type === 'series' && item.completed) {
        seriesCompleted++;
      }
      
      // Thống kê thể loại
      if (item.movieId.category && Array.isArray(item.movieId.category)) {
        item.movieId.category.forEach(cat => {
          const categoryName = typeof cat === 'object' ? cat.name : cat;
          if (categoryName) {
            categories.add(categoryName);
            genreCounts[categoryName] = (genreCounts[categoryName] || 0) + 1;
          }
        });
      } else if (item.movieId.category && typeof item.movieId.category === 'string') {
        categories.add(item.movieId.category);
        genreCounts[item.movieId.category] = (genreCounts[item.movieId.category] || 0) + 1;
      }
    });
    
    // Sắp xếp thể loại yêu thích theo số lượt xem
    const favoriteGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    // Tính giờ và phút từ tổng số giây
    const totalWatchTimeMinutes = Math.floor(totalWatchTimeSeconds / 60);
    const hours = Math.floor(totalWatchTimeMinutes / 60);
    const minutes = Math.floor(totalWatchTimeMinutes % 60);
    
    return responseHelper.successResponse(res, 'User watch statistics retrieved successfully', {
      totalWatchedMovies: moviesWatched.size,
      totalWatchedSeries: seriesWatched.size,
      totalWatched: moviesWatched.size + seriesWatched.size, // Thêm trường totalWatched
      totalWatchTimeSeconds,
      totalWatchTimeMinutes,
      totalWatchTime: {
        hours,
        minutes,
        displayText: `${hours} giờ ${minutes} phút`
      },
      favoriteGenres: favoriteGenres.slice(0, 5), // Top 5 thể loại
      seriesCompleted,
      categories: Array.from(categories)
    });
  } catch (error) {
    console.error('Error getting user watch stats:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy hoạt động xem phim trong tuần của người dùng
 */
exports.getUserWeeklyActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const startDay = getStartOfWeek(today); // Sử dụng hàm tự viết thay vì date-fns
    
    // Khởi tạo mảng cho 7 ngày trong tuần, từ CN đến T7
    const weeklyHours = [0, 0, 0, 0, 0, 0, 0];
    
    // Lấy dữ liệu lịch sử xem phim trong tuần này
    const weekHistory = await History.find({
      userId,
      createdAt: { $gte: startDay }
    }).populate('movieId', 'duration');
    
    // Tính tổng thời gian xem theo ngày
    weekHistory.forEach(item => {
      const createdAt = new Date(item.createdAt);
      const dayOfWeek = createdAt.getDay(); // 0 = Chủ Nhật, 6 = Thứ Bảy
      
      // Tính thời gian xem (phút)
      let duration = item.watchDuration || 0;
      if (!duration && item.movieId && item.movieId.duration) {
        duration = parseInt(item.movieId.duration);
      }
        // Cộng vào tổng thời gian của ngày tương ứng (chuyển từ giây sang giờ)
      weeklyHours[dayOfWeek] += duration / 3600;
    });
    
    // Làm tròn đến 1 chữ số thập phân
    const roundedWeeklyHours = weeklyHours.map(hours => Math.round(hours * 10) / 10);
    
    return responseHelper.successResponse(res, 'Weekly activity retrieved successfully', roundedWeeklyHours);
  } catch (error) {
    console.error('Error getting user weekly activity:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy phân bố thể loại phim mà người dùng đã xem
 */
exports.getUserGenreDistribution = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Lấy lịch sử xem phim
    const history = await History.find({ userId }).populate('movieId', 'category');
    
    // Đếm số lượt xem mỗi thể loại
    const genreCounts = {};
    let totalCount = 0;
    
    history.forEach(item => {
      if (!item.movieId) return;
      
      // Xử lý trường category - có thể là array hoặc string
      if (item.movieId.category && Array.isArray(item.movieId.category)) {
        item.movieId.category.forEach(cat => {
          const categoryName = typeof cat === 'object' ? cat.name : cat;
          if (categoryName) {
            genreCounts[categoryName] = (genreCounts[categoryName] || 0) + 1;
            totalCount++;
          }
        });
      } else if (item.movieId.category && typeof item.movieId.category === 'string') {
        genreCounts[item.movieId.category] = (genreCounts[item.movieId.category] || 0) + 1;
        totalCount++;
      }
    });
    
    // Chuyển đổi counts thành phần trăm
    const genreDistribution = Object.entries(genreCounts).map(([name, count]) => ({
      name,
      count,
      value: Math.round((count / totalCount) * 100)
    }));
    
    // Sắp xếp theo phần trăm giảm dần
    genreDistribution.sort((a, b) => b.value - a.value);
    
    return responseHelper.successResponse(
      res, 
      'Genre distribution retrieved successfully', 
      genreDistribution.slice(0, 8) // Chỉ lấy 8 thể loại cao nhất
    );
  } catch (error) {
    console.error('Error getting user genre distribution:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy dữ liệu thời gian xem phim theo ngày (7 ngày gần nhất)
 */
exports.getUserDailyViewingTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const dailyData = [];
    
    // Lấy dữ liệu cho 7 ngày gần nhất
    for (let i = 0; i < 7; i++) {
      const date = subDaysFromDate(today, 6 - i); // Sử dụng hàm tự viết thay vì date-fns
      const startDate = getStartOfDay(date); // Sử dụng hàm tự viết thay vì date-fns
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Lấy lịch sử xem phim của ngày
      const dayHistory = await History.find({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('movieId', 'duration');
      
      // Tính tổng thời gian xem trong ngày (phút)
      let totalMinutes = 0;
      dayHistory.forEach(item => {
        let duration = item.watchDuration || 0;
        if (!duration && item.movieId && item.movieId.duration) {
          duration = parseInt(item.movieId.duration);
        }
        totalMinutes += duration;
      });
      
      dailyData.push({
        date: date,
        minutes: totalMinutes,
        viewCount: dayHistory.length
      });
    }
    
    return responseHelper.successResponse(res, 'Daily viewing time retrieved successfully', dailyData);
  } catch (error) {
    console.error('Error getting daily viewing time:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy tiến độ xem phim của người dùng theo series
 */
exports.getUserSeriesProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { seriesId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      return responseHelper.badRequestResponse(res, 'Invalid series ID');
    }
    
    // Lấy thông tin series
    const series = await Movie.findById(seriesId);
    
    if (!series) {
      return responseHelper.notFoundResponse(res, 'Series not found');
    }
    
    // Lấy tất cả tập phim đã xem
    const watchedEpisodes = await History.find({
      userId,
      movieId: seriesId
    });
    
    // Tính số tập đã xem và tổng số tập
    const watchedEpisodeNumbers = new Set(watchedEpisodes.map(item => item.episode));
    const totalEpisodes = series.episodes && series.episodes[0] ? 
      series.episodes[0].server_data.length : 0;
    
    // Tính phần trăm hoàn thành
    const completionPercentage = totalEpisodes > 0 ? 
      Math.round((watchedEpisodeNumbers.size / totalEpisodes) * 100) : 0;
    
    // Kiểm tra xem đã hoàn thành series chưa
    const isCompleted = completionPercentage >= 100;
    
    return responseHelper.successResponse(res, 'Series progress retrieved successfully', {
      seriesId,
      seriesName: series.name,
      totalEpisodes,
      watchedEpisodes: watchedEpisodeNumbers.size,
      watchedEpisodesList: Array.from(watchedEpisodeNumbers).sort((a, b) => a - b),
      completionPercentage,
      isCompleted
    });
  } catch (error) {
    console.error('Error getting user series progress:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy danh sách series đang xem của người dùng
 */
exports.getUserInProgressSeries = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Lấy lịch sử xem của các phim series
    const seriesHistory = await History.find({ userId })
      .populate('movieId', 'name thumb_url poster_url type episodes')
      .sort({ updatedAt: -1 });
    
    // Lọc ra các series
    const seriesMap = new Map();
    
    seriesHistory.forEach(item => {
      if (item.movieId && item.movieId.type === 'series') {
        const seriesId = item.movieId._id.toString();
        
        // Nếu series chưa được thêm vào map
        if (!seriesMap.has(seriesId)) {
          // Tính số tập đã xem và tổng số tập
          const totalEpisodes = item.movieId.episodes && item.movieId.episodes[0] ? 
            item.movieId.episodes[0].server_data.length : 0;
          
          seriesMap.set(seriesId, {
            seriesId,
            seriesName: item.movieId.name,
            thumbUrl: item.movieId.thumb_url || item.movieId.poster_url,
            lastWatched: item.updatedAt,
            watchedEpisodes: new Set([item.episode]),
            totalEpisodes,
            lastWatchedEpisode: item.episode
          });
        } else {
          // Thêm tập đã xem vào set
          const seriesData = seriesMap.get(seriesId);
          seriesData.watchedEpisodes.add(item.episode);
          
          // Cập nhật tập mới xem nhất nếu cần
          if (new Date(item.updatedAt) > new Date(seriesData.lastWatched)) {
            seriesData.lastWatched = item.updatedAt;
            seriesData.lastWatchedEpisode = item.episode;
          }
        }
      }
    });
    
    // Chuyển Map thành mảng và tính toán phần trăm hoàn thành
    const inProgressSeries = Array.from(seriesMap.values()).map(series => {
      const completionPercentage = series.totalEpisodes > 0 ? 
        Math.round((series.watchedEpisodes.size / series.totalEpisodes) * 100) : 0;
      
      return {
        ...series,
        watchedEpisodesCount: series.watchedEpisodes.size,
        completionPercentage,
        isCompleted: completionPercentage === 100
      };
    });
    
    // Sắp xếp theo thời gian xem gần nhất
    inProgressSeries.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
    
    return responseHelper.successResponse(res, 'In-progress series retrieved successfully', inProgressSeries);
  } catch (error) {
    console.error('Error getting in-progress series:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

/**
 * Lấy các thành tựu xem phim của người dùng
 */
exports.getUserAchievements = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Lấy dữ liệu chi tiết từ các bảng liên quan với populate đầy đủ
    const [historyData, ratingData, favoritesData, watchlistData, commentLikes, comments, movieViews] = await Promise.all([
      History.find({ userId }).populate('movieId', 'name type category duration episodes').lean(),
      Movie.aggregate([
        // Tìm ratings của user hiện tại
        { $lookup: {
            from: 'ratings',
            let: { movieId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                      { $eq: ['$movieId', '$$movieId'] }
                    ]
                  }
                }
              }
            ],
            as: 'userRatings'
          }
        },
        // Lọc các phim có rating từ user
        { $match: { 'userRatings.0': { $exists: true } } },
        // Project thông tin cần thiết
        { $project: {
            _id: 1,
            name: 1,
            type: 1,
            rating: { $arrayElemAt: ['$userRatings.rating', 0] }
          }
        }
      ]),
      Favorite.findOne({ userId }).lean(),
      Watchlist.findOne({ userId }).lean(),
      // Thêm truy vấn lượt thích từ người dùng
      mongoose.model('CommentLike').find({ userId }).lean(),
      // Thêm truy vấn bình luận từ người dùng
      mongoose.model('Comment').find({ userId }).lean(),
      // Thêm truy vấn lượt xem từ người dùng
      MovieView.find({ userId }).lean()
    ]);
    
    // Đếm và phân loại phim đã xem
    const movieIdSet = new Set();
    const seriesIdSet = new Set();
    const categorySet = new Set();
    let totalWatchTimeSeconds = 0;
    let completedMoviesCount = 0;
    let completedSeriesCount = 0;
    
    // Map để theo dõi tiến độ xem phim bộ
    const seriesProgressMap = new Map();
    
    // Xử lý dữ liệu lịch sử xem
    historyData.forEach(item => {
      if (!item.movieId) return;
      
      // Xác định loại phim và thêm vào tập hợp tương ứng
      if (item.movieId.type === 'movie') {
        movieIdSet.add(item.movieId._id.toString());
        
        // Kiểm tra phim đã xem hoàn chỉnh chưa
        const duration = item.movieId.duration ? parseInt(item.movieId.duration) : 0;
        if (item.completed || (item.watchDuration && item.watchDuration >= duration * 0.8)) {
          completedMoviesCount++;
        }
      } else if (item.movieId.type === 'series') {
        const seriesId = item.movieId._id.toString();
        seriesIdSet.add(seriesId);
        
        // Theo dõi tập đã xem
        if (!seriesProgressMap.has(seriesId)) {
          const totalEpisodes = item.movieId.episodes && item.movieId.episodes[0] ? 
                               item.movieId.episodes[0].server_data.length : 0;
          
          seriesProgressMap.set(seriesId, {
            id: seriesId,
            totalEpisodes,
            watchedEpisodes: new Set([item.episode]),
          });
        } else {
          seriesProgressMap.get(seriesId).watchedEpisodes.add(item.episode);
        }
      }
      
      // Thêm thời gian xem (lưu ở seconds)
      const watchDuration = item.watchDuration || 0;
      totalWatchTimeSeconds += watchDuration;
      
      // Thêm thể loại
      if (item.movieId.category) {
        if (Array.isArray(item.movieId.category)) {
          item.movieId.category.forEach(cat => {
            const categoryName = typeof cat === 'object' ? cat.name : cat;
            if (categoryName) categorySet.add(categoryName);
          });
        } else if (typeof item.movieId.category === 'string') {
          categorySet.add(item.movieId.category);
        }
      }
    });
    
    // Đếm series đã hoàn thành
    seriesProgressMap.forEach(series => {
      if (series.watchedEpisodes.size >= series.totalEpisodes && series.totalEpisodes > 0) {
        completedSeriesCount++;
      }
    });
    
    // Lấy số lượng phim đã đánh giá
    const ratedMoviesCount = ratingData.length;
    
    // Lấy số lượng phim yêu thích và xem sau từ danh sách
    const favoritesCount = favoritesData && favoritesData.movieIds ? favoritesData.movieIds.length : 0;
    const watchlistCount = watchlistData && watchlistData.movieIds ? watchlistData.movieIds.length : 0;
    
    // Tính toán thời gian xem
    const totalWatchTimeMinutes = Math.floor(totalWatchTimeSeconds / 60);
    const watchTimeHours = Math.floor(totalWatchTimeMinutes / 60);
    const watchTimeMinutes = Math.floor(totalWatchTimeMinutes % 60);
    
    // Lấy số lượng lượt thích, bình luận và lượt xem
    const likes = commentLikes ? commentLikes.filter(like => like.type === 'like') : [];
    const dislikes = commentLikes ? commentLikes.filter(like => like.type === 'dislike') : [];
    const totalLikes = likes.length;
    const totalDislikes = dislikes.length;
    const totalComments = comments ? comments.length : 0;
    const viewCount = movieViews ? movieViews.length : 0;
    
    // Tạo danh sách thành tựu dựa trên dữ liệu thực tế
    const achievements = [
      {
        id: 'new-viewer',
        name: 'Người xem mới',
        description: 'Xem 5 phim đầu tiên',
        requiredValue: 5,
        currentValue: movieIdSet.size + seriesIdSet.size,
        completed: (movieIdSet.size + seriesIdSet.size) >= 5
      },
      {
        id: 'genre-explorer',
        name: 'Khám phá thể loại',
        description: 'Xem phim thuộc 5 thể loại khác nhau',
        requiredValue: 5,
        currentValue: categorySet.size,
        completed: categorySet.size >= 5
      },
      {
        id: 'movie-enthusiast',
        name: 'Người hâm mộ phim lẻ',
        description: 'Xem tổng cộng 20 phim lẻ',
        requiredValue: 20,
        currentValue: movieIdSet.size,
        completed: movieIdSet.size >= 20
      },
      {
        id: 'series-enthusiast',
        name: 'Người hâm mộ phim bộ',
        description: 'Xem tổng cộng 10 phim bộ khác nhau',
        requiredValue: 10,
        currentValue: seriesIdSet.size,
        completed: seriesIdSet.size >= 10
      },
      {
        id: 'collector',
        name: 'Sưu tầm',
        description: 'Thêm 10 phim vào danh sách yêu thích',
        requiredValue: 10,
        currentValue: favoritesCount,
        completed: favoritesCount >= 10
      },
      {
        id: 'planner',
        name: 'Người lập kế hoạch',
        description: 'Thêm 15 phim vào danh sách xem sau',
        requiredValue: 15,
        currentValue: watchlistCount,
        completed: watchlistCount >= 15
      },
      {
        id: 'critic',
        name: 'Nhà phê bình',
        description: 'Đánh giá 10 phim khác nhau',
        requiredValue: 10,
        currentValue: ratedMoviesCount,
        completed: ratedMoviesCount >= 10
      },
      {
        id: 'movie-marathon',
        name: 'Marathon phim',
        description: 'Dành hơn 10 giờ xem phim',
        requiredValue: 600, // 10 giờ = 600 phút
        currentValue: totalWatchTimeMinutes,
        completed: totalWatchTimeMinutes >= 600
      },
      {
        id: 'movie-completionist',
        name: 'Hoàn thành phim lẻ',
        description: 'Xem trọn vẹn 15 phim lẻ',
        requiredValue: 15,
        currentValue: completedMoviesCount,
        completed: completedMoviesCount >= 15
      },
      {
        id: 'series-completionist',
        name: 'Hoàn thành phim bộ',
        description: 'Xem hết tất cả tập của 5 phim bộ',
        requiredValue: 5,
        currentValue: completedSeriesCount,
        completed: completedSeriesCount >= 5
      }
    ];
    
    // Tính toán cấp độ người dùng dựa trên số thành tựu đạt được
    const completedAchievements = achievements.filter(a => a.completed).length;
    let userLevel = 'Người mới';
    let levelProgress = 0;
    
    if (completedAchievements >= 8) {
      userLevel = 'Bậc thầy điện ảnh';
      levelProgress = 100;
    } else if (completedAchievements >= 6) {
      userLevel = 'Chuyên gia';
      levelProgress = 85;
    } else if (completedAchievements >= 4) {
      userLevel = 'Đạo diễn';
      levelProgress = 70;
    } else if (completedAchievements >= 2) {
      userLevel = 'Người hâm mộ';
      levelProgress = 55;
    } else if (completedAchievements >= 1) {
      userLevel = 'Người xem thường xuyên';
      levelProgress = 40;
    } else {
      levelProgress = 20;
    }
    
    // Trả về dữ liệu chi tiết
    return responseHelper.successResponse(res, 'User achievements retrieved successfully', {
      achievements,
      stats: {
        moviesWatched: movieIdSet.size,
        seriesWatched: seriesIdSet.size,
        totalWatched: movieIdSet.size + seriesIdSet.size,
        categoriesExplored: categorySet.size,
        favoritesCount,
        watchlistCount,
        ratedMoviesCount,
        totalRatings: ratedMoviesCount, // Thêm totalRatings để dễ dàng sử dụng trong frontend
        watchTimeSeconds: totalWatchTimeSeconds,
        watchTimeMinutes: totalWatchTimeMinutes,
        watchTimeHours,
        watchTimeDisplay: `${watchTimeHours} giờ ${watchTimeMinutes} phút`,
        completedMovies: completedMoviesCount,
        completedSeries: completedSeriesCount,
        completedAchievements,
        totalAchievements: achievements.length,
        userLevel,
        levelProgress,
        // Thêm các thuộc tính mới
        totalLikes,
        totalDislikes,
        totalComments,
        viewCount,
        completedWatchCount: completedMoviesCount + completedSeriesCount
      }
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};