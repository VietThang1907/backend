// controllers/movieController.js
const MovieService = require("../services/movieService");
const { successResponse, serverErrorResponse, notFoundResponse, badRequestResponse } = require("../utils/responseHelper");
const ophimService = require('../services/ophimService');

class MovieController {
    // Thêm mới phim
    async create(req, res) {
        try {
            // Validate required fields
            const requiredFields = [
                'name',
                'origin_name',
                'slug',
                'content',
                'type',
                'status',
                'year',
                'quality',
                'lang',
                'category',
                'country'
            ];

            const missingFields = requiredFields.filter(field => !req.body[field]);
            if (missingFields.length > 0) {
                return badRequestResponse(
                    res,
                    `Thiếu các trường bắt buộc: ${missingFields.join(', ')}`
                );
            }

            // Validate arrays
            if (!Array.isArray(req.body.category) || req.body.category.length === 0) {
                return badRequestResponse(res, 'Phải có ít nhất một thể loại phim');
            }

            if (!Array.isArray(req.body.country) || req.body.country.length === 0) {
                return badRequestResponse(res, 'Phải có ít nhất một quốc gia');
            }

            // Validate enums
            const validTypes = ['movie', 'series', 'tv'];
            const validStatus = ['completed', 'updating'];
            const validQuality = ['HD', 'FHD', 'SD'];
            const validLang = ['Vietsub', 'Thuyết minh'];

            if (!validTypes.includes(req.body.type)) {
                return badRequestResponse(res, 'Loại phim không hợp lệ');
            }

            if (!validStatus.includes(req.body.status)) {
                return badRequestResponse(res, 'Trạng thái phim không hợp lệ');
            }

            if (!validQuality.includes(req.body.quality)) {
                return badRequestResponse(res, 'Chất lượng phim không hợp lệ');
            }

            if (!validLang.includes(req.body.lang)) {
                return badRequestResponse(res, 'Ngôn ngữ phim không hợp lệ');
            }

            // Validate year
            const year = parseInt(req.body.year);
            if (isNaN(year) || year < 1900 || year > 2100) {
                return badRequestResponse(res, 'Năm sản xuất không hợp lệ');
            }

            const movie = await MovieService.createMovie(req.body);
            successResponse(res, "Thêm phim thành công", movie, 201);
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Lấy tất cả phim
    async getAll(req, res) {
        try {
            const result = await MovieService.getAllMovies(req.query);
            
            successResponse(res, "Danh sách phim", {
                movies: result.movies,
                pagination: {
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    totalMovies: result.totalMovies,
                    moviesPerPage: result.moviesPerPage
                }
            });
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Lấy phim theo ID
    async getById(req, res) {
        const { movieId } = req.params;

        try {
            const movie = await MovieService.getMovieById(movieId);
            if (!movie) {
                return notFoundResponse(res, "Phim không tồn tại");
            }
            successResponse(res, "Thông tin phim", movie);
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Lấy phim theo slug
    async getBySlug(req, res) {
        const { slug } = req.params;

        try {
            const movie = await MovieService.getMovieBySlug(slug);
            if (!movie) {
                return notFoundResponse(res, "Phim không tồn tại");
            }
            successResponse(res, "Thông tin phim", movie);
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Cập nhật phim
    async update(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        try {
            // Validate enums if they are provided
            if (updateData.type && !['movie', 'series', 'tv'].includes(updateData.type)) {
                return badRequestResponse(res, 'Loại phim không hợp lệ');
            }

            if (updateData.status && !['completed', 'updating'].includes(updateData.status)) {
                return badRequestResponse(res, 'Trạng thái phim không hợp lệ');
            }

            if (updateData.quality && !['HD', 'FHD', 'SD'].includes(updateData.quality)) {
                return badRequestResponse(res, 'Chất lượng phim không hợp lệ');
            }

            if (updateData.lang && !['Vietsub', 'Thuyết minh'].includes(updateData.lang)) {
                return badRequestResponse(res, 'Ngôn ngữ phim không hợp lệ');
            }

            // Validate year if provided
            if (updateData.year) {
                const year = parseInt(updateData.year);
                if (isNaN(year) || year < 1900 || year > 2100) {
                    return badRequestResponse(res, 'Năm sản xuất không hợp lệ');
                }
                updateData.year = year;
            }

            // Validate arrays if provided
            if (updateData.category && (!Array.isArray(updateData.category) || updateData.category.length === 0)) {
                return badRequestResponse(res, 'Phải có ít nhất một thể loại phim');
            }

            if (updateData.country && (!Array.isArray(updateData.country) || updateData.country.length === 0)) {
                return badRequestResponse(res, 'Phải có ít nhất một quốc gia');
            }

            const updatedMovie = await MovieService.updateMovie(id, updateData);
            if (!updatedMovie) {
                return notFoundResponse(res, "Phim không tồn tại");
            }
            successResponse(res, "Cập nhật phim thành công", updatedMovie);
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Xóa phim
    async delete(req, res) {
        const { id } = req.params;

        try {
            const deletedMovie = await MovieService.deleteMovie(id);
            if (!deletedMovie) {
                return notFoundResponse(res, "Phim không tồn tại");
            }
            successResponse(res, "Xóa phim thành công");
        } catch (error) {
            serverErrorResponse(res, error.message);
        }
    }

    // Lấy danh sách phim từ OPhim API
    // Lấy danh sách phim từ OPhim API với page từ query
    async getOphimMovies(req, res) {
        const page = req.query.page || 1; // Default to page 1 if not provided
        try {
            const ophimMovies = await ophimService.getNewestMovies(page);
            successResponse(res, "Danh sách phim từ OPhim", ophimMovies);
        } catch (error) {
            serverErrorResponse(res, "Không thể lấy phim từ OPhim API", error.message);
        }
    }

    // Lấy tất cả phim từ OPhim API
    async getAllOphimMovies(req, res) {
        try {
            const ophimMovies = await ophimService.getAllNewestMovies();
            successResponse(res, "Danh sách tất cả phim từ OPhim", ophimMovies);
        } catch (error) {
            serverErrorResponse(res, "Không thể lấy tất cả phim từ OPhim API", error.message);
        }
    }

    // Lấy thông tin chi tiết phim từ OPhim API
    async getOphimMovieDetails(req, res) {
        const { slug } = req.params;

        try {
            const movieDetails = await ophimService.getMovieDetails(slug);
            successResponse(res, "Thông tin chi tiết phim từ OPhim", movieDetails);
        } catch (error) {
            serverErrorResponse(res, "Không thể lấy thông tin phim từ OPhim API", error.message);
        }
    }

    // Lấy phim xem nhiều nhất trong ngày
    async getMostViewedMovies(req, res) {
        try {
            const { days = 1, limit = 10 } = req.query;
            
            // Calculate the date from which to count views
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            
            // Use the MovieView model to get most viewed movies
            const MovieView = require('../models/movieView');
            const Movie = require('../models/movie');
            
            // Aggregate to get most viewed movies since the start date
            const mostViewedMovies = await MovieView.aggregate([
                {
                    $match: {
                        viewDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$movieId",
                        viewCount: { $sum: 1 }
                    }
                },
                {
                    $sort: { viewCount: -1 }
                },
                {
                    $limit: parseInt(limit)
                },
                {
                    $lookup: {
                        from: "movies",
                        localField: "_id",
                        foreignField: "_id",
                        as: "movieDetails"
                    }
                },
                {
                    $unwind: "$movieDetails"
                },
                {
                    $project: {
                        _id: "$movieDetails._id",
                        name: "$movieDetails.name",
                        origin_name: "$movieDetails.origin_name",
                        slug: "$movieDetails.slug",
                        year: "$movieDetails.year",
                        thumb_url: "$movieDetails.thumb_url",
                        poster_url: "$movieDetails.poster_url",
                        backdrop_url: "$movieDetails.backdrop_url",
                        type: "$movieDetails.type",
                        quality: "$movieDetails.quality",
                        lang: "$movieDetails.lang",
                        episodes: "$movieDetails.episodes",
                        viewCount: 1
                    }
                }
            ]);
            
            // If we don't have enough data, supplement with top rated movies
            if (mostViewedMovies.length < 5) {
                const additionalMovies = await Movie.find({})
                    .sort({ rating: -1 })
                    .limit(parseInt(limit) - mostViewedMovies.length);
                
                const formattedAdditionalMovies = additionalMovies.map(movie => ({
                    _id: movie._id,
                    name: movie.name,
                    origin_name: movie.origin_name,
                    slug: movie.slug,
                    year: movie.year,
                    thumb_url: movie.thumb_url,
                    poster_url: movie.poster_url,
                    backdrop_url: movie.backdrop_url,
                    type: movie.type,
                    quality: movie.quality,
                    lang: movie.lang,
                    episodes: movie.episodes,
                    viewCount: Math.floor(Math.random() * 300) + 200 // Simulated view count
                }));
                
                // Combine both lists
                const combinedResults = [...mostViewedMovies, ...formattedAdditionalMovies].slice(0, parseInt(limit));
                
                return successResponse(res, "Danh sách phim xem nhiều nhất", {
                    movies: combinedResults
                });
            }
            
            return successResponse(res, "Danh sách phim xem nhiều nhất", {
                movies: mostViewedMovies
            });
        } catch (error) {
            console.error('Error getting most viewed movies:', error);
            return serverErrorResponse(res, "Không thể lấy danh sách phim xem nhiều nhất", error.message);
        }
    }
}

module.exports = new MovieController();
