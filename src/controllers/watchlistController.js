const Watchlist = require('../models/watchlist');
const Movie = require('../models/movie');
const mongoose = require('mongoose');
const responseHelper = require('../utils/responseHelper');

// Get watchlist for current user
exports.getWatchlist = async (req, res) => {
    try {
        // Get userId from the user object in request
        // Use req.user.userId which comes from the JWT token
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            return responseHelper.unauthorizedResponse(res, 'Không thể xác định người dùng');
        }

        // Find the user's watchlist
        const watchlist = await Watchlist.findOne({ userId });

        if (!watchlist) {
            // If no watchlist exists, create one
            const newWatchlist = new Watchlist({
                userId,
                movieIds: []
            });
            await newWatchlist.save();
            
            return responseHelper.successResponse(res, 'Danh sách xem sau trống', {
                movies: []
            });
        }

        // Get the movies from the watchlist
        const movies = await Movie.find({
            _id: { $in: watchlist.movieIds }
        }).select('name original_title thumb_url poster_url slug year time duration quality');

        return responseHelper.successResponse(res, 'Đã lấy danh sách xem sau thành công', {
            movies: movies.map(movie => ({
                id: movie._id,
                title: movie.name,                       // name field instead of title
                original_title: movie.original_title,
                slug: movie.slug,
                thumbnail: movie.thumb_url || movie.poster_url,  // Use thumb_url or poster_url
                year: movie.year,
                duration: movie.time || movie.duration,  // Use time or duration
                quality: movie.quality,
                type: movie.type
            }))
        });
    } catch (error) {
        console.error('Error getting watchlist:', error);
        return responseHelper.serverErrorResponse(res, 'Không thể lấy danh sách xem sau');
    }
};

// Add movie to watchlist
exports.addToWatchlist = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            return responseHelper.unauthorizedResponse(res, 'Không thể xác định người dùng');
        }
        
        const { slug, movieId } = req.body;

        if (!slug && !movieId) {
            return responseHelper.badRequestResponse(res, 'Thiếu thông tin phim');
        }

        // Find the movie by slug or id
        let movie;
        if (movieId) {
            movie = await Movie.findById(movieId);
        } else {
            movie = await Movie.findOne({ slug });
        }

        if (!movie) {
            return responseHelper.notFoundResponse(res, 'Không tìm thấy phim');
        }

        // Find the user's watchlist or create one if it doesn't exist
        let watchlist = await Watchlist.findOne({ userId });
        
        if (!watchlist) {
            watchlist = new Watchlist({
                userId,
                movieIds: [movie._id]
            });
            await watchlist.save();
            
            return responseHelper.successResponse(res, 'Đã thêm phim vào danh sách xem sau', {
                movieId: movie._id
            });
        }

        // Check if the movie is already in the watchlist
        if (watchlist.movieIds.includes(movie._id)) {
            return responseHelper.successResponse(res, 'Phim đã có trong danh sách xem sau', {
                alreadyExists: true,
                movieId: movie._id
            });
        }

        // Add the movie to the watchlist
        watchlist.movieIds.push(movie._id);
        await watchlist.save();

        return responseHelper.successResponse(res, 'Đã thêm phim vào danh sách xem sau', {
            movieId: movie._id
        });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return responseHelper.serverErrorResponse(res, 'Không thể thêm phim vào danh sách xem sau');
    }
};

// Check if movie is in watchlist
exports.checkWatchlist = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            return responseHelper.unauthorizedResponse(res, 'Không thể xác định người dùng');
        }
        
        const { movieId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return responseHelper.badRequestResponse(res, 'ID phim không hợp lệ');
        }

        // Find the user's watchlist
        const watchlist = await Watchlist.findOne({ userId });

        if (!watchlist) {
            return responseHelper.successResponse(res, 'Kiểm tra danh sách xem sau thành công', {
                isInWatchlist: false
            });
        }

        // Check if the movie is in the watchlist
        const isInWatchlist = watchlist.movieIds.includes(movieId) || 
                              watchlist.movieIds.some(id => id.toString() === movieId);

        return responseHelper.successResponse(res, 'Kiểm tra danh sách xem sau thành công', {
            isInWatchlist
        });
    } catch (error) {
        console.error('Error checking watchlist:', error);
        return responseHelper.serverErrorResponse(res, 'Không thể kiểm tra danh sách xem sau');
    }
};

// Remove movie from watchlist
exports.removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            return responseHelper.unauthorizedResponse(res, 'Không thể xác định người dùng');
        }
        
        const { movieId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return responseHelper.badRequestResponse(res, 'ID phim không hợp lệ');
        }

        // Find the user's watchlist
        const watchlist = await Watchlist.findOne({ userId });

        if (!watchlist) {
            return responseHelper.notFoundResponse(res, 'Không tìm thấy danh sách xem sau');
        }

        // Check if the movie is in the watchlist
        const movieIndex = watchlist.movieIds.findIndex(id => id.toString() === movieId);
        
        if (movieIndex === -1) {
            return responseHelper.notFoundResponse(res, 'Phim không có trong danh sách xem sau');
        }

        // Remove the movie from the watchlist
        watchlist.movieIds.splice(movieIndex, 1);
        await watchlist.save();

        return responseHelper.successResponse(res, 'Đã xóa phim khỏi danh sách xem sau');
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        return responseHelper.serverErrorResponse(res, 'Không thể xóa phim khỏi danh sách xem sau');
    }
};

// Clear watchlist
exports.clearWatchlist = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            return responseHelper.unauthorizedResponse(res, 'Không thể xác định người dùng');
        }

        // Find the user's watchlist
        const watchlist = await Watchlist.findOne({ userId });

        if (!watchlist) {
            return responseHelper.successResponse(res, 'Danh sách xem sau đã trống');
        }

        // Clear the watchlist
        watchlist.movieIds = [];
        await watchlist.save();

        return responseHelper.successResponse(res, 'Đã xóa tất cả phim trong danh sách xem sau');
    } catch (error) {
        console.error('Error clearing watchlist:', error);
        return responseHelper.serverErrorResponse(res, 'Không thể xóa danh sách xem sau');
    }
};