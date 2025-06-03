// services/movieService.js
const Movie = require("../models/movie");

// Cấu hình logging - đặt thành false để tắt tất cả các log
const DEBUG_MODE = false;

// Hàm helper để log có điều kiện
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

class MovieService {
    // Thêm mới phim
    async createMovie(movieData) {
        try {
            const movie = new Movie(movieData);
            return await movie.save();
        } catch (error) {
            throw new Error("Không thể thêm phim mới: " + error.message);
        }
    }

    // Lấy tất cả phim kèm thông tin category
    async getAllMovies(queryParams) {
        try {
            // Lấy giá trị page và limit từ query params, chuyển sang kiểu number
            let { page, limit, name, category, country, year, type } = queryParams;
            
            // Kiểm tra và đặt giá trị mặc định nếu không có hoặc không hợp lệ
            page = parseInt(page) || 1;
            limit = parseInt(limit) || 24;
            
            // Đảm bảo giá trị tối thiểu
            if (page < 1) page = 1;
            if (limit < 1) limit = 1;
            
            // Giới hạn tối đa cho limit để tránh tải quá nhiều dữ liệu
            const MAX_LIMIT = 100;
            if (limit > MAX_LIMIT) limit = MAX_LIMIT;
            
            // Xây dựng điều kiện tìm kiếm
            const query = {
                // Lọc ra các phim không bị ẩn
                isHidden: { $ne: true }
            };
            
            // Tìm kiếm theo tên phim (tìm kiếm không phân biệt hoa thường)
            if (name) {
                query.$or = [
                    { name: { $regex: name, $options: 'i' } },
                    { origin_name: { $regex: name, $options: 'i' } }
                ];
            }
            
            // Tìm kiếm theo thể loại
            if (category) {
                query['category.name'] = { $regex: category, $options: 'i' };
            }
            
            // Tìm kiếm theo quốc gia
            if (country) {
                query['country.name'] = { $regex: country, $options: 'i' };
            }
            
            // Tìm kiếm theo năm
            if (year && !isNaN(parseInt(year))) {
                query.year = parseInt(year);
            }
            
            // Tìm kiếm theo loại phim (Thêm mới)
            if (type) {
                // Nếu type là mảng, sử dụng $in để tìm kiếm phim có một trong các loại được chỉ định
                if (Array.isArray(type)) {
                    query.type = { $in: type };
                } else {
                    query.type = type;
                }
            }

            debugLog("Query conditions:", JSON.stringify(query, null, 2));
            
            const skip = (page - 1) * limit;
            
            // Thực hiện tìm kiếm với các điều kiện đã xây dựng
            const movies = await Movie.find(query)
                .sort({ modified: -1, _id: -1 }) // Sắp xếp theo mới nhất
                .skip(skip)
                .limit(limit)
                .lean();
            
            const totalMovies = await Movie.countDocuments(query);
            const totalPages = Math.ceil(totalMovies / limit);
            
            return {
                movies,
                currentPage: page,
                totalPages,
                totalMovies,
                moviesPerPage: limit
            };
        } catch (error) {
            console.error("Error in getAllMovies:", error);
            throw new Error("Không thể lấy danh sách phim: " + error.message);
        }
    }

    // Lấy phim theo ID kèm thông tin category
    async getMovieById(movieId) {
        try {
            // Bỏ populate('category_id') vì trường này không tồn tại trong schema
            return await Movie.findById(movieId).lean(); // Chỉ sử dụng lean()
        } catch (error) {
            throw new Error("Không thể lấy thông tin phim: " + error.message);
        }
    }

    // Lấy phim theo slug
    async getMovieBySlug(slug) {
        try {
            // Thêm điều kiện isHidden: { $ne: true } để không lấy phim đã bị ẩn
            return await Movie.findOne({ slug, isHidden: { $ne: true } }).lean();
        } catch (error) {
            throw new Error("Không thể lấy thông tin phim: " + error.message);
        }
    }

    // Cập nhật thông tin phim
    async updateMovie(movieId, updateData) {
        try {
            return await Movie.findByIdAndUpdate(movieId, updateData, { new: true });
        } catch (error) {
            throw new Error("Không thể cập nhật phim: " + error.message);
        }
    }

    // Xóa phim
    async deleteMovie(movieId) {
        try {
            return await Movie.findByIdAndDelete(movieId);
        } catch (error) {
            throw new Error("Không thể xóa phim: " + error.message);
        }
    }
}

module.exports = new MovieService();
