// controllers/upcomingMovieController.js

const UpcomingMovie = require('../models/upcomingMovie');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

/**
 * Lấy danh sách phim sắp ra mắt
 */
exports.getAllUpcomingMovies = async (req, res) => {
  try {
    // Các thông số phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Lấy query tìm kiếm nếu có
    const searchQuery = req.query.search || '';
    
    // Xây dựng bộ lọc dựa trên tìm kiếm và các bộ lọc khác
    let filter = {};
    
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { origin_name: { $regex: searchQuery, $options: 'i' } },
        { slug: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Thêm lọc theo danh mục nếu có
    if (req.query.category) {
      filter['category.id'] = req.query.category;
    }
    
    // Thêm lọc theo năm nếu có
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    
    // Thêm lọc theo trạng thái ẩn/hiện nếu có
    if (req.query.isHidden !== undefined) {
      filter.isHidden = req.query.isHidden === 'true';
    }
    
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
};

/**
 * Lấy thông tin chi tiết phim sắp ra mắt theo ID
 */
exports.getUpcomingMovieById = async (req, res) => {
  try {
    const upcomingMovieId = req.params.id;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(upcomingMovieId)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }
    
    const upcomingMovie = await UpcomingMovie.findById(upcomingMovieId);
    
    if (!upcomingMovie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim sắp ra mắt' });
    }
    
    res.status(200).json({ success: true, upcomingMovie });
  } catch (err) {
    console.error('Error fetching upcoming movie details:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin phim sắp ra mắt' });
  }
};

/**
 * Tạo phim sắp ra mắt mới
 */
exports.createUpcomingMovie = async (req, res) => {
  try {
    // Kiểm tra lỗi validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Tạo slug từ tên phim
    const generatedSlug = slugify(req.body.name);
    
    // Kiểm tra trùng slug
    const existingMovie = await UpcomingMovie.findOne({ slug: generatedSlug });
    if (existingMovie) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phim với slug này đã tồn tại' 
      });
    }
    
    // Tạo phim mới
    const newUpcomingMovie = new UpcomingMovie({
      ...req.body,
      slug: generatedSlug
    });
    
    // Lưu vào database
    await newUpcomingMovie.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Thêm phim sắp ra mắt thành công', 
      upcomingMovie: newUpcomingMovie 
    });
  } catch (err) {
    console.error('Error creating upcoming movie:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo phim sắp ra mắt mới' });
  }
};

/**
 * Cập nhật thông tin phim sắp ra mắt
 */
exports.updateUpcomingMovie = async (req, res) => {
  try {
    const upcomingMovieId = req.params.id;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(upcomingMovieId)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }
    
    // Kiểm tra nếu tên được thay đổi thì cập nhật slug
    if (req.body.name) {
      req.body.slug = slugify(req.body.name);
      
      // Kiểm tra trùng slug với phim khác
      const existingMovie = await UpcomingMovie.findOne({ 
        slug: req.body.slug,
        _id: { $ne: upcomingMovieId }
      });
      
      if (existingMovie) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phim với slug này đã tồn tại' 
        });
      }
    }
    
    // Cập nhật phim
    const updatedUpcomingMovie = await UpcomingMovie.findByIdAndUpdate(
      upcomingMovieId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedUpcomingMovie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim sắp ra mắt' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Cập nhật phim sắp ra mắt thành công', 
      upcomingMovie: updatedUpcomingMovie 
    });
  } catch (err) {
    console.error('Error updating upcoming movie:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật phim sắp ra mắt' });
  }
};

/**
 * Xóa phim sắp ra mắt
 */
exports.deleteUpcomingMovie = async (req, res) => {
  try {
    const upcomingMovieId = req.params.id;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(upcomingMovieId)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }
    
    const deletedUpcomingMovie = await UpcomingMovie.findByIdAndDelete(upcomingMovieId);
    
    if (!deletedUpcomingMovie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim sắp ra mắt' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Xóa phim sắp ra mắt thành công'
    });
  } catch (err) {
    console.error('Error deleting upcoming movie:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa phim sắp ra mắt' });
  }
};

/**
 * Chuyển phim sắp ra mắt thành phim đã phát hành
 */
exports.releaseMovie = async (req, res) => {
  try {
    const upcomingMovieId = req.params.id;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(upcomingMovieId)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }
    
    // Tìm phim sắp ra mắt
    const upcomingMovie = await UpcomingMovie.findById(upcomingMovieId);
    
    if (!upcomingMovie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim sắp ra mắt' });
    }
    
    // Chuyển từ UpcomingMovie sang Movie
    const Movie = require('../models/movie');
    
    // Kiểm tra nếu slug đã tồn tại trong bảng Movie
    const existingMovie = await Movie.findOne({ slug: upcomingMovie.slug });
    
    if (existingMovie) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phim với slug này đã tồn tại trong danh sách phim. Vui lòng cập nhật tên phim trước khi phát hành' 
      });
    }
    
    // Tạo một Movie mới từ dữ liệu của UpcomingMovie
    const movieData = upcomingMovie.toObject();
    delete movieData._id; // Xóa _id để tạo _id mới cho collection Movie
    
    // Cập nhật các thuộc tính cần thiết cho phim đã phát hành
    movieData.status = 'ongoing'; // Hoặc 'completed' tùy trường hợp
    movieData.episode_current = movieData.episode_current || 'Tập 1';
    movieData.episode_total = movieData.episode_total || '1 tập';
    
    // Tạo bản ghi Movie mới
    const newMovie = new Movie(movieData);
    await newMovie.save();
    
    // Cập nhật trạng thái phim sắp ra mắt
    upcomingMovie.is_released = true;
    await upcomingMovie.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Phim đã được chuyển sang trạng thái phát hành thành công', 
      upcomingMovie,
      movie: newMovie
    });
  } catch (err) {
    console.error('Error releasing movie:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi chuyển phim sang trạng thái phát hành: ' + err.message });
  }
};