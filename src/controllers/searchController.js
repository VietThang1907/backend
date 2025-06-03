// src/controllers/searchController.js
const { searchMovies, initClient, getSuggestions } = require('../services/elasticsearchService'); // Import hàm search, initClient và getSuggestions từ service
const Movie = require('../models/movie'); // Import model Movie cho fallback

// Danh sách các tiền tố (tên trường Elasticsearch) được hỗ trợ
// Bạn có thể thêm/bớt các trường tùy theo nhu cầu
const supportedFields = [
    'name',         // Tên phim
    'origin_name',  // Tên gốc
    'actor',        // Diễn viên
    'director',     // Đạo diễn
    'content',      // Nội dung
    'category',     // Thể loại (sẽ tìm trong category.name/slug ở service)
    'country',      // Quốc gia (sẽ tìm trong country.name/slug ở service)
    'year',         // Năm
    'lang',         // Ngôn ngữ
    'status',       // Trạng thái
    'type',         // Loại phim
    'slug'          // Slug (tìm chính xác)
];

/**
 * Fallback tìm kiếm bằng MongoDB khi Elasticsearch không khả dụng
 * @param {string} query - Từ khóa tìm kiếm
 * @param {string|null} field - Trường cụ thể muốn tìm
 * @param {number} limit - Giới hạn số kết quả
 * @param {number} skip - Số lượng kết quả bỏ qua (phân trang)
 * @returns {Promise<Object>} - Kết quả tìm kiếm gồm hits và total
 */
async function searchWithMongoDB(query, field, limit, skip, req) {
    console.log(`Fallback to MongoDB search for: "${query}" ${field ? `in field "${field}"` : 'across multiple fields'}`);

    let mongoQuery = {
        // Thêm điều kiện lọc bỏ phim đã ẩn
        isHidden: { $ne: true }
    };

    // Xây dựng query dựa trên field (nếu có)
    if (field) {
        if (field === 'category') {
            mongoQuery = { ...mongoQuery, 'category.name': { $regex: query, $options: 'i' } };
        } else if (field === 'country') {
            mongoQuery = { ...mongoQuery, 'country.name': { $regex: query, $options: 'i' } };
        } else if (field === 'year') {
            const yearValue = parseInt(query);
            if (!isNaN(yearValue)) {
                mongoQuery = { ...mongoQuery, 'year': yearValue };
            } else {
                return { hits: [], total: 0 }; // Trả về kết quả rỗng nếu năm không hợp lệ
            }
        } else if (['name', 'origin_name', 'actor', 'director', 'content'].includes(field)) {
            mongoQuery[field] = { $regex: query, $options: 'i' };
        } else if (['lang', 'status', 'type', 'slug'].includes(field)) {
            mongoQuery[field] = query; // Tìm chính xác cho các trường này
        }
    } else {
        // Tìm kiếm tổng hợp trên nhiều trường
        mongoQuery = {
            ...mongoQuery,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { origin_name: { $regex: query, $options: 'i' } },
                { actor: { $regex: query, $options: 'i' } },
                { director: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { 'category.name': { $regex: query, $options: 'i' } },
                { 'country.name': { $regex: query, $options: 'i' } }
            ]
        };
    }

    // Thêm bộ lọc cho các tham số bổ sung nếu có
    if (req && req.query) {
        if (req.query.category) {
            mongoQuery['category.name'] = { $regex: req.query.category, $options: 'i' };
        }
        if (req.query.country) {
            mongoQuery['country.name'] = { $regex: req.query.country, $options: 'i' };
        }
        if (req.query.year && !isNaN(parseInt(req.query.year))) {
            mongoQuery['year'] = parseInt(req.query.year);
        }
        if (req.query.type) {
            mongoQuery['type'] = req.query.type;
        }
        if (req.query.duration) {
            mongoQuery['duration'] = req.query.duration;
        }
    }

    // Thực hiện truy vấn với MongoDB và đếm tổng số kết quả
    const totalCount = await Movie.countDocuments(mongoQuery);
    
    // Thực hiện truy vấn với limit và skip
    const results = await Movie.find(mongoQuery)
        .select('-episodes') // Bỏ qua field episodes để giảm kích thước response
        .limit(limit)
        .skip(skip)
        .lean(); // Trả về plain object thay vì Mongoose document

    const hits = results.map(movie => ({
        id: movie._id.toString(),
        ...movie,
        _id: undefined, // Loại bỏ _id trùng lặp vì đã có id
        score: 1 // Thêm score mặc định khi sử dụng MongoDB
    }));

    return {
        hits,
        total: totalCount
    };
}

/**
 * Xử lý request tìm kiếm phim.
 * Phân tích query 'q' để tìm kiếm theo trường cụ thể (nếu có tiền tố)
 * hoặc tìm kiếm chung trên nhiều trường (nếu không có tiền tố).
 */
async function handleSearch(req, res) {
    const rawQuery = req.query.q || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.max(1, Math.min(100, parseInt(req.query.size) || 20));
    const from = (page - 1) * size;
    
    // Lấy các bộ lọc bổ sung
    const filters = {
        category: req.query.category || '',
        country: req.query.country || '',
        year: req.query.year ? parseInt(req.query.year) : null,
        type: req.query.type || '',
        // Thêm bộ lọc duration (độ dài video)
        duration: req.query.duration || '',
        // Thêm xử lý cho tham số search_description
        search_description: req.query.search_description === 'true'
    };
    
    // Log thông tin tìm kiếm để debug
    console.log('Search filters:', filters);
    
    // --- PHẦN PHÂN TÍCH TIỀN TỐ ---
    let targetField = null; // Trường cụ thể muốn tìm (mặc định là null - tìm chung)
    let actualQueryText = rawQuery.trim(); // Từ khóa tìm kiếm thực tế (ban đầu là toàn bộ query)

    // Chỉ phân tích nếu query không rỗng
    if (actualQueryText) {
        for (const field of supportedFields) {
            const prefix = field + ':';
            // Kiểm tra không phân biệt hoa thường và có thể có khoảng trắng sau dấu hai chấm
            if (actualQueryText.toLowerCase().startsWith(prefix.toLowerCase())) {
                // Tách phần còn lại sau tiền tố làm từ khóa tìm kiếm thực tế
                const potentialQueryText = actualQueryText.substring(prefix.length).trim();

                // Chỉ chấp nhận tiền tố nếu có nội dung tìm kiếm đi kèm
                if (potentialQueryText) {
                    targetField = field; // Lưu lại tên trường hợp lệ
                    actualQueryText = potentialQueryText; // Cập nhật từ khóa thực tế
                    break; // Dừng lại khi tìm thấy tiền tố hợp lệ đầu tiên
                }
            }
        }
    }
    // -----------------------------

    // Nếu không có từ khóa tìm kiếm thực tế (sau khi đã xử lý tiền tố) VÀ không có bộ lọc nào
    if (!actualQueryText && !filters.category && !filters.country && !filters.year && !filters.type && !filters.duration) {
        // Thay vì báo lỗi, trả về danh sách phim mới nhất
        try {
            const query = { isHidden: { $ne: true } }; // Lọc ra phim chưa bị ẩn
            
            const latestMovies = await Movie.find(query)
                .select('-episodes')
                .sort({ createdAt: -1 })
                .limit(size)
                .skip(from)
                .lean();
                
            const totalCount = await Movie.countDocuments(query);
            
            const hits = latestMovies.map(movie => ({
                id: movie._id.toString(),
                ...movie,
                _id: undefined,
                score: 1
            }));
            
            return res.status(200).json({
                success: true,
                hits: hits,
                total: totalCount,
                maxScore: 1
            });
        } catch (error) {
            console.error('Error fetching latest movies:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching latest movies',
                error: error.message
            });
        }
    }

    try {
        // Ghi log để biết đang tìm gì và ở đâu
        console.log(`API searching for: "${actualQueryText}" ${targetField ? 'in field "' + targetField + '"' : 'across multiple fields'}, size: ${size}, from: ${from}, filters:`, filters);

        // Thử khởi tạo Elasticsearch client trước khi tìm kiếm
        let searchResults = null;
        const esClient = await initClient();
        
        if (esClient) {
            // Elasticsearch khả dụng, sử dụng nó cho tìm kiếm
            try {
                searchResults = await searchMovies(actualQueryText, targetField, size, from, filters);
                console.log(`ES search found ${searchResults.hits.length} results out of ${searchResults.total}.`);
            } catch (esSearchError) {
                console.error('Error using Elasticsearch search:', esSearchError);
                // Nếu tìm kiếm bằng ES thất bại, fallback về MongoDB
                searchResults = await searchWithMongoDB(actualQueryText, targetField, size, from, req);
                console.log(`Fallback MongoDB search found ${searchResults.hits.length} results out of ${searchResults.total}.`);
            }
        } else {
            // Elasticsearch không khả dụng, dùng fallback MongoDB
            searchResults = await searchWithMongoDB(actualQueryText, targetField, size, from, req);
            console.log(`MongoDB search found ${searchResults.hits.length} results out of ${searchResults.total}.`);
        }

        // Trả về kết quả dạng JSON với format giống Elasticsearch để frontend dễ xử lý
        return res.status(200).json({
            success: true,
            hits: searchResults.hits || [],
            total: searchResults.total || 0,
            maxScore: searchResults.maxScore || 1
        });
    } catch (error) {
        // Log lỗi và trả về lỗi 500 với thông báo rõ ràng
        console.error('Search API controller error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred during search operation',
            error: error.message
        });
    }
}

/**
 * Xử lý request gợi ý tìm kiếm từ Elasticsearch
 * Trả về danh sách các từ khóa gợi ý dựa trên những gì người dùng đang gõ.
 */
async function handleGetSuggestions(req, res) {
  try {
    const query = req.query.q || '';
    const limit = Math.min(10, parseInt(req.query.limit) || 5);
    
    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }
    
    // Thử khởi tạo Elasticsearch client
    const esClient = await initClient();
    
    if (!esClient) {
      // Elasticsearch không khả dụng, trả về mảng rỗng
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }
    
    // Lấy gợi ý từ Elasticsearch
    const suggestions = await getSuggestions(query, limit);
    
    return res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching search suggestions',
      error: error.message
    });
  }
}

module.exports = { 
  handleSearch,
  handleGetSuggestions
};