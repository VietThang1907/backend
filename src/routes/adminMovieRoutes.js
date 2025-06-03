// src/routes/adminMovieRoutes.js
const express = require('express');
const router = express.Router();
const Movie = require('../models/movie');
const Category = require('../models/category');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');

// Apply authentication and admin-only middleware to all routes
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * GET /admin/movies
 * Get all movies with pagination for admin panel
 */
router.get('/movies', async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get search query if available
    const searchQuery = req.query.search || '';
    
    // Build the filter based on search query and other filters
    let filter = searchQuery 
      ? { 
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { origin_name: { $regex: searchQuery, $options: 'i' } },
            { slug: { $regex: searchQuery, $options: 'i' } }
          ] 
        } 
      : {};
    
    // Add category filter if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Add status filter if provided 
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    // Add isHidden filter if provided
    if (req.query.isHidden !== undefined) {
      filter.isHidden = req.query.isHidden === 'true';
    }
    
    // Add year filter if provided
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    
    // Add type filter if provided (series/single)
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Get sort parameters
    const sortField = req.query.sort || 'updatedAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };
    
    // Get movies with pagination - Return all necessary fields
    const movies = await Movie.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('_id name origin_name slug type status year quality lang thumb_url poster_url trailer_url backdrop_url content time country category director actor episodes rating vote_count views is_copyright chieurap sub_docquyen notify showtimes episode_current episode_total tmdb imdb createdAt updatedAt');
      
    // Get total count for pagination
    const totalCount = await Movie.countDocuments(filter);
    
    // Trả về kết quả đầy đủ cho frontend
    return res.status(200).json({
      movies,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        itemsPerPage: limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching movies for admin panel:', error);
    return res.status(500).json({
      message: 'Failed to fetch movies',
      error: error.message
    });
  }
});

/**
 * GET /admin/movies/categories
 * Get all categories for movies
 */
router.get('/movies/categories', async (req, res) => {
  try {
    // Get all categories from the Category collection
    const categories = await Category.find().sort({ name: 1 });
    
    return res.status(200).json({
      message: 'Categories retrieved successfully',
      categories
    });
  } catch (error) {
    console.error('Error fetching movie categories:', error);
    return res.status(500).json({
      message: 'Failed to fetch movie categories',
      error: error.message
    });
  }
});

/**
 * GET /admin/movies/:id
 * Get a specific movie by ID
 */
router.get('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found'
      });
    }
    
    return res.status(200).json({
      message: 'Movie retrieved successfully',
      movie
    });
  } catch (error) {
    console.error('Error fetching movie details for admin panel:', error);
    return res.status(500).json({
      message: 'Failed to fetch movie details',
      error: error.message
    });
  }
});

/**
 * POST /admin/movies
 * Create a new movie
 */
router.post('/movies', async (req, res) => {
  try {
    // Kiểm tra slug đã tồn tại chưa
    if (req.body.slug) {
      const existingMovie = await Movie.findOne({ slug: req.body.slug });
      if (existingMovie) {
        return res.status(400).json({
          message: 'Movie with this slug already exists'
        });
      }
    }
    
    // Đảm bảo các trường cần thiết được cung cấp
    const requiredFields = ['name', 'origin_name', 'slug', 'type', 'year'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Xử lý dữ liệu trước khi lưu
    const movieData = {
      // Thông tin cơ bản
      name: req.body.name,
      origin_name: req.body.origin_name,
      slug: req.body.slug,
      year: req.body.year,
      type: req.body.type || 'movie', // Mặc định là phim lẻ
      status: req.body.status || 'active',
      quality: req.body.quality || 'HD',
      lang: req.body.lang || 'Vietsub',
      
      // Nội dung
      content: req.body.content || '',
      
      // Thông tin tập
      time: req.body.time || '',
      episode_current: req.body.episode_current || '',
      episode_total: req.body.episode_total || '',
      
      // Thông tin hình ảnh và trailer
      thumb_url: req.body.thumb_url || '',
      poster_url: req.body.poster_url || '',
      backdrop_url: req.body.backdrop_url || '',
      trailer_url: req.body.trailer_url || '',
      
      // Thông tin thể loại, quốc gia
      category: req.body.category || [],
      country: req.body.country || [],
      
      // Thông tin diễn viên, đạo diễn
      director: req.body.director || [],
      actor: req.body.actor || [],
      
      // Thông tin đánh giá
      rating: req.body.rating || 0,
      vote_count: req.body.vote_count || 0,
      
      // Thông tin bổ sung
      is_copyright: req.body.is_copyright || false,
      chieurap: req.body.chieurap || false,
      sub_docquyen: req.body.sub_docquyen || false,
      notify: req.body.notify || '',
      showtimes: req.body.showtimes || '',
      
      // Thông tin từ TMDB và IMDB
      tmdb: req.body.tmdb || { 
        id: '', 
        type: '', 
        season: 0,
        vote_average: 0,
        vote_count: 0
      },
      imdb: req.body.imdb || { id: '' },
      
      // Thông tin tập phim
      episodes: req.body.episodes || []
    };
    
    // Tạo và lưu movie mới với đầy đủ thông tin
    const movie = new Movie(movieData);
    await movie.save();
    
    // Log thông tin đã tạo
    console.log(`✅ Created new movie: ${movie.name} (${movie._id})`);
    
    // Gửi thông báo qua WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { 
        type: 'movie',
        action: 'created',
        data: {
          id: movie._id,
          name: movie.name
        }
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Movie created successfully',
      movie
    });
  } catch (error) {
    console.error('Error creating movie:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create movie',
      error: error.message
    });
  }
});

/**
 * PUT /admin/movies/:id
 * Update a movie
 */
router.put('/movies/:id', async (req, res) => {
  try {
    // Check if slug is being updated and already exists
    if (req.body.slug) {
      const existingMovie = await Movie.findOne({ 
        slug: req.body.slug,
        _id: { $ne: req.params.id }
      });
      
      if (existingMovie) {
        return res.status(400).json({
          message: 'Another movie with this slug already exists'
        });
      }
    }
    
    // Tạo một đối tượng với các trường cần cập nhật
    const updateData = {};
    
    // Danh sách các trường có thể cập nhật
    const allowedFields = [
      // Thông tin cơ bản
      'name', 'origin_name', 'slug', 'year', 'type', 'status', 'quality', 'lang',
      
      // Nội dung
      'content',
      
      // Thông tin tập phim
      'time', 'episode_current', 'episode_total',
      
      // Đường dẫn hình ảnh và trailer
      'thumb_url', 'poster_url', 'backdrop_url', 'trailer_url',
      
      // Thông tin thể loại, quốc gia
      'category', 'country',
      
      // Thông tin đạo diễn, diễn viên
      'director', 'actor',
      
      // Thông tin đánh giá
      'rating', 'vote_count',
      
      // Các cờ và thông tin bổ sung
      'is_copyright', 'chieurap', 'sub_docquyen', 'notify', 'showtimes',
      
      // Thông tin bên ngoài
      'tmdb', 'imdb',
      
      // Danh sách tập phim
      'episodes'
    ];
    
    // Lọc và thêm các trường hợp lệ vào đối tượng cập nhật
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Cập nhật thời gian sửa đổi
    updateData.updatedAt = new Date();
    
    // Find and update the movie
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }
    
    // Log thông tin đã cập nhật
    console.log(`✅ Updated movie: ${movie.name} (${movie._id})`);
    
    // Gửi thông báo qua WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { 
        type: 'movie',
        action: 'updated',
        data: {
          id: movie._id,
          name: movie.name
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Movie updated successfully',
      movie
    });
  } catch (error) {
    console.error('Error updating movie:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update movie',
      error: error.message
    });
  }
});

/**
 * DELETE /admin/movies/:id
 * Delete a movie
 */
router.delete('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found'
      });
    }
    
    // Lưu thông tin trước khi xóa
    const movieInfo = {
      id: movie._id,
      name: movie.name
    };
    
    // Xóa phim
    await Movie.findByIdAndDelete(req.params.id);
    
    // Gửi thông báo qua WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { 
        type: 'movie',
        action: 'deleted',
        data: movieInfo
      });
    }
    
    console.log(`✅ Deleted movie: ${movieInfo.name} (${movieInfo.id})`);
    
    return res.status(200).json({
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting movie:', error);
    return res.status(500).json({
      message: 'Failed to delete movie',
      error: error.message
    });
  }
});

/**
 * PATCH /admin/movies/:id/visibility
 * Toggle movie visibility status
 */
router.patch('/movies/:id/visibility', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }
    
    // Đổi ngược trạng thái ẩn của phim
    movie.isHidden = !movie.isHidden;
    await movie.save();
    
    // Gửi thông báo qua WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { 
        type: 'movie',
        action: 'visibilityChanged',
        data: {
          id: movie._id,
          name: movie.name,
          isHidden: movie.isHidden
        }
      });
    }
    
    console.log(`✅ Changed movie visibility: ${movie.name} (${movie._id}) to ${movie.isHidden ? 'hidden' : 'visible'}`);
    
    return res.status(200).json({
      success: true,
      message: `Movie ${movie.isHidden ? 'hidden' : 'shown'} successfully`,
      movie
    });
  } catch (error) {
    console.error('Error updating movie visibility:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update movie visibility',
      error: error.message
    });
  }
});

/**
 * PUT /admin/movies/:id/visibility
 * Thêm phương thức PUT cho toggle visibility (tương tự PATCH)
 */
router.put('/movies/:id/visibility', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }
    
    // Đổi ngược trạng thái ẩn của phim (giống như phương thức PATCH)
    movie.isHidden = !movie.isHidden;
    await movie.save();
    
    // Gửi thông báo qua WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { 
        type: 'movie',
        action: 'visibilityChanged',
        data: {
          id: movie._id,
          name: movie.name,
          isHidden: movie.isHidden
        }
      });
    }
    
    console.log(`✅ Changed movie visibility (PUT): ${movie.name} (${movie._id}) to ${movie.isHidden ? 'hidden' : 'visible'}`);
    
    return res.status(200).json({
      success: true,
      message: `Movie ${movie.isHidden ? 'hidden' : 'shown'} successfully`,
      movie
    });
  } catch (error) {
    console.error('Error updating movie visibility (PUT):', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update movie visibility',
      error: error.message
    });
  }
});

/**
 * GET /admin/movies/hidden
 * Get all hidden movies with pagination for admin panel
 */
router.get('/movies/hidden', async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build the filter for hidden movies
    const filter = { isHidden: true };
    
    // Add other filters if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Get sort parameters
    const sortField = req.query.sort || 'updatedAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };
    
    // Get hidden movies with pagination
    const movies = await Movie.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('_id name origin_name slug type year quality lang thumb_url poster_url content category country isHidden createdAt updatedAt');
      
    // Get total count for pagination
    const totalCount = await Movie.countDocuments(filter);
    
    // Trả về kết quả đầy đủ cho frontend
    return res.status(200).json({
      success: true,
      data: {
        movies,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          itemsPerPage: limit
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching hidden movies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch hidden movies',
      error: error.message
    });
  }
});

module.exports = router;