// src/controllers/adminSearchController.js

const { 
  initClient, 
  searchMovies,
  INDEX_NAME 
} = require('../services/elasticsearchService');

/**
 * Tìm kiếm phim dùng Elasticsearch cho trang admin
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} - Danh sách phim thỏa mãn điều kiện tìm kiếm
 */
exports.searchMoviesForAdmin = async (req, res) => {
  try {
    // Khởi tạo client Elasticsearch nếu chưa được khởi tạo
    await initClient();
    
    // Lấy thông số từ query params
    const {
      search,        // Từ khóa tìm kiếm
      page = 1,      // Trang hiện tại
      limit = 10,    // Số lượng phim mỗi trang
      category,      // Lọc theo thể loại
      status,        // Lọc theo trạng thái (active/inactive)
      year,          // Lọc theo năm
      type,          // Lọc theo loại (series/single)
      isHidden,      // Lọc theo trạng thái ẩn/hiện
      sort = 'updatedAt', // Trường sắp xếp
      order = 'desc' // Thứ tự sắp xếp
    } = req.query;
    
    // Tăng kích thước size để đảm bảo có đủ kết quả sau khi lọc trùng lặp
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    // Lấy nhiều kết quả hơn để bù đắp cho việc loại bỏ trùng lặp
    const requestSize = limitNum * 2;
    const requestFrom = (pageNum - 1) * limitNum;
    
    // Xây dựng bộ lọc từ query params
    const filters = {};
    
    if (category) filters.category = category;
    if (status && status !== 'all') filters.status = status;
    if (year) filters.year = parseInt(year);
    if (type) filters.type = type;
    // Thêm điều kiện lọc theo trạng thái ẩn/hiện
    if (isHidden !== undefined) {
      filters.isHidden = isHidden === 'true' || isHidden === true;
    }
    
    // Xử lý đặc biệt khi không có từ khóa tìm kiếm hoặc từ khóa trống
    // Đảm bảo truy vấn match_all nếu không có từ khóa tìm kiếm
    const searchTerm = search && search.trim().length > 0 ? search : null;
    
    // Tìm kiếm từ Elasticsearch service với kích thước lớn hơn
    const searchResults = await searchMovies(
      searchTerm,    // Từ khóa tìm kiếm hoặc null nếu không có
      null,           // Không giới hạn trường tìm kiếm
      requestSize,    // Kích thước lớn hơn để bù đắp cho việc loại bỏ trùng lặp
      requestFrom,    // Vị trí bắt đầu
      filters,        // Bộ lọc
      true            // Đánh dấu đây là truy vấn từ admin
    );
    
    // Chuẩn bị response
    const { hits, total } = searchResults;
    
    // Loại bỏ các bản ghi trùng lặp dựa vào slug hoặc id
    const uniqueMovies = [];
    const uniqueIds = new Set();
    const uniqueSlugs = new Set();
    
    hits.forEach(hit => {
      const movieId = hit.id || hit._id;
      const movieSlug = hit.slug;
      
      // Chỉ thêm vào danh sách kết quả nếu ID và slug chưa tồn tại
      if ((!movieId || !uniqueIds.has(movieId)) && 
          (!movieSlug || !uniqueSlugs.has(movieSlug))) {
        
        // Lưu ID và slug vào Set để kiểm tra trùng lặp
        if (movieId) uniqueIds.add(movieId);
        if (movieSlug) uniqueSlugs.add(movieSlug);
        
        uniqueMovies.push({
          _id: hit.id,
          ...hit
        });
      }
    });

    // Lấy đúng số lượng kết quả cho trang hiện tại
    const paginatedResults = uniqueMovies.slice(0, limitNum);

    // Điều chỉnh thông tin phân trang dựa trên tổng số kết quả thực tế
    const estimatedTotalItems = hits.length > 0 
      ? Math.floor(total * (uniqueMovies.length / hits.length))
      : total;
    const estimatedTotalPages = Math.ceil(estimatedTotalItems / limitNum);
    
    // Log thông tin để debug nếu cần
    console.log(`Search term: ${searchTerm || 'none'}, Total hits: ${hits.length}, Unique: ${uniqueMovies.length}`);
    
    // Trả về kết quả định dạng giống MongoDB để frontend không cần thay đổi
    return res.status(200).json({
      movies: paginatedResults,
      pagination: {
        totalItems: estimatedTotalItems,
        totalPages: estimatedTotalPages,
        currentPage: pageNum,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Elasticsearch admin search error:', error);
    
    // Nếu có lỗi, trả về response lỗi
    return res.status(500).json({
      message: 'Lỗi khi tìm kiếm phim với Elasticsearch',
      error: error.message
    });
  }
};

/**
 * Kiểm tra xem Elasticsearch có hoạt động không
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} - Trạng thái của Elasticsearch
 */
exports.checkElasticsearchStatus = async (req, res) => {
  try {
    console.log('Checking Elasticsearch status...');
    const client = await initClient();
    
    if (!client) {
      console.log('Elasticsearch client is not available');
      return res.status(200).json({
        success: true,
        status: 'inactive',
        message: 'Elasticsearch is not available or disabled.'
      });
    }
    
    try {
      // Thực hiện một truy vấn đơn giản để kiểm tra kết nối
      console.log('Executing count query on index:', INDEX_NAME);
      const response = await client.count({ index: INDEX_NAME });
      console.log('Elasticsearch count response:', response);
      
      // Extract the count based on ES client version
      let count = 0;
      if (response && response.body) {
        count = response.body.count || 0;
      } else if (response && response.count !== undefined) {
        count = response.count;
      }
      
      console.log('Elasticsearch status: active, document count:', count);
      
      return res.status(200).json({
        success: true,
        status: 'active',
        message: 'Elasticsearch is connected and working properly.',
        documentCount: count
      });
    } catch (queryError) {
      console.error('Error querying Elasticsearch index:', queryError);
      return res.status(200).json({
        success: true,
        status: 'error',
        message: 'Error querying Elasticsearch: ' + queryError.message
      });
    }
  } catch (error) {
    console.error('Error checking Elasticsearch status:', error);
    
    return res.status(200).json({
      success: true,
      status: 'error',
      message: 'Error connecting to Elasticsearch: ' + error.message
    });
  }
};