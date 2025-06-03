// src/controllers/reportController.js
const Report = require('../models/report');
const Movie = require('../models/movie'); // Thêm model Movie để tham chiếu
const responseHelper = require('../utils/responseHelper');

/**
 * Lấy danh sách báo cáo với phân trang và lọc
 */
exports.getReports = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      type = '', 
      status = '' 
    } = req.query;

    const query = {};
    
    // Áp dụng điều kiện lọc nếu có
    if (type) query.type = type;
    if (status) query.status = status;
      // Tìm kiếm theo reason, description hoặc tên phim
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'movieInfo.name': { $regex: search, $options: 'i' } } // Thêm tìm kiếm theo tên phim
      ];
    }const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'fullname name email avatar' },
        { path: 'contentId', select: 'title name text' }  // Tùy thuộc vào contentType
      ]
    };

    // Thực hiện truy vấn với phân trang
    const reports = await Report.find(query)
      .populate('userId', 'fullname name email avatar')
      .populate('contentId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Đếm tổng số báo cáo phù hợp với điều kiện lọc
    const total = await Report.countDocuments(query);

    responseHelper.successResponse(res, 'Lấy danh sách báo cáo thành công', {
      reports,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi lấy danh sách báo cáo');
  }
};

/**
 * Lấy chi tiết một báo cáo theo ID
 */
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
      const report = await Report.findById(reportId)
      .populate('userId', 'fullname name email avatar')
      .populate('contentId');
    
    if (!report) {
      return responseHelper.notFoundResponse(res, 'Không tìm thấy báo cáo');
    }
    
    responseHelper.successResponse(res, 'Lấy thông tin báo cáo thành công', report);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi lấy thông tin báo cáo');
  }
};

/**
 * Tạo một báo cáo mới
 */
exports.createReport = async (req, res) => {
  try {
    const { 
      contentId, 
      contentType, 
      type, 
      reason, 
      description 
    } = req.body;
    
    // Lấy userId từ người dùng đã xác thực
    const userId = req.user._id;
    
    const newReport = new Report({
      userId,
      contentId,
      contentType,
      type,
      reason,
      description,
      status: 'pending'
    });
    
    await newReport.save();
    
    responseHelper.successResponse(res, 'Tạo báo cáo thành công', newReport, 201);
  } catch (error) {
    console.error('Error creating report:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi tạo báo cáo');
  }
};

/**
 * Cập nhật trạng thái báo cáo
 */
exports.updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    // Chỉ cho phép cập nhật status và adminNotes
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      { status, adminNotes, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('contentId');
    
    if (!updatedReport) {
      return responseHelper.notFoundResponse(res, 'Không tìm thấy báo cáo');
    }
    
    responseHelper.successResponse(res, 'Cập nhật báo cáo thành công', updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi cập nhật báo cáo');
  }
};

/**
 * Xóa một báo cáo
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const deletedReport = await Report.findByIdAndDelete(reportId);
    
    if (!deletedReport) {
      return responseHelper.notFoundResponse(res, 'Không tìm thấy báo cáo');
    }
    
    responseHelper.successResponse(res, 'Xóa báo cáo thành công', { message: 'Xóa báo cáo thành công' });
  } catch (error) {
    console.error('Error deleting report:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi xóa báo cáo');
  }
};

/**
 * Xử lý báo cáo lỗi phim
 */
exports.reportMovie = async (req, res) => {
  try {
    const { movieId, movieSlug, type, message, episode } = req.body;
    
    // Lấy userId từ người dùng đã xác thực
    const userId = req.user._id;
    
    // Nếu có movieSlug nhưng không có movieId, tìm movieId từ slug
    let contentId = movieId;
    let movieData = null;
    
    // Tìm thông tin phim từ slug hoặc id
    if (movieSlug) {
      movieData = await Movie.findOne({ slug: movieSlug });
      if (movieData && !contentId) {
        contentId = movieData._id;
      }
    } else if (contentId) {
      movieData = await Movie.findById(contentId);
    }
    
    // Xác thực dữ liệu đầu vào
    if (!type) {
      return responseHelper.badRequestResponse(res, 'Vui lòng chọn loại lỗi');
    }
    
    // Chuẩn bị dữ liệu báo cáo
    const reportData = {
      userId,
      contentId,
      contentType: 'Movie',
      type: 'movie',
      reason: type,
      description: message || type,
      status: 'pending'
    };
    
    // Thêm thông tin về phim nếu có
    if (movieData) {
      reportData.movieInfo = {
        id: movieData._id.toString(),
        name: movieData.name || '',
        slug: movieData.slug || movieSlug || '',
        thumb: movieData.thumb_url || movieData.poster_url || '',
        episode: parseInt(episode) || 1 // Lưu thông tin tập phim đang xem
      };
    }
    
    const newReport = new Report(reportData);
    await newReport.save();
    
    return responseHelper.createdResponse(res, 'Báo cáo lỗi phim thành công', 
      { success: true, message: 'Báo cáo lỗi phim thành công', report: newReport }
    );
  } catch (error) {
    console.error('Error reporting movie:', error);
    return responseHelper.serverErrorResponse(res, 'Lỗi khi báo cáo phim');
  }
};

/**
 * Thống kê báo cáo
 */
exports.getReportStats = async (req, res) => {
  try {
    // Đếm số lượng báo cáo theo trạng thái
    const statusStats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Đếm số lượng báo cáo theo loại
    const typeStats = await Report.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Đếm tổng số báo cáo
    const totalReports = await Report.countDocuments();
    
    // Đếm số báo cáo mới trong 7 ngày qua
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const newReports = await Report.countDocuments({
      createdAt: { $gte: lastWeek }
    });
    
    responseHelper.successResponse(res, 'Lấy thống kê báo cáo thành công', {
      total: totalReports,
      new: newReports,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    responseHelper.serverErrorResponse(res, 'Lỗi khi lấy thống kê báo cáo');
  }
};