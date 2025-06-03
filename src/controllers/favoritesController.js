const FavoritesList = require('../models/favoritesList');
const User = require('../models/user');
const Movie = require('../models/movie');
const responseHelper = require('../utils/responseHelper');

// Cấu hình logging - đặt thành false để tắt tất cả các log
const DEBUG_MODE = false;

// Hàm helper để log có điều kiện
const debugLog = (...args) => {
    if (DEBUG_MODE) {
        console.log(...args);
    }
};

// Get favorites for the logged-in user
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        debugLog('Fetching favorites for user:', userId);

        debugLog('Request headers:', req.headers);
        debugLog('Request user object:', req.user);

        // Find or create the user's favorites list
        let favoritesList = await FavoritesList.findOne({ userId }).populate({
            path: 'movieIds',
            select: 'name slug origin_name thumb_url poster_url rating year quality type _id'
        });

        debugLog('Found favorites list:', favoritesList ? `yes, with ${favoritesList.movieIds.length} movies` : 'no');
        
        if (favoritesList) {
            debugLog('FavoritesList object:', JSON.stringify(favoritesList));
            debugLog('MovieIds full data:', JSON.stringify(favoritesList.movieIds));
        }

        if (!favoritesList || !favoritesList.movieIds || favoritesList.movieIds.length === 0) {
            debugLog('No favorites found or empty list');
            return responseHelper.successResponse(res, 'No favorites found', []);
        }

        debugLog('Individual movies in favorites:');
        favoritesList.movieIds.forEach((movie, index) => {
            debugLog(`Movie ${index}:`, 
                movie ? 
                `ID: ${movie._id}, Name: ${movie.name}, Slug: ${movie.slug}` : 
                'Invalid movie reference');
        });

        const favorites = favoritesList.movieIds
            .filter(movie => movie && movie._id)
            .map(movie => {
                debugLog('Processing movie in favorites:', movie._id, movie.name, movie.slug);
                
                const movieData = {
                    id: movie._id.toString(),
                    title: movie.name || 'Không có tiêu đề',
                    original_title: movie.origin_name || '',
                    slug: movie.slug || '',
                    thumbnail: movie.thumb_url || movie.poster_url || '',
                    year: movie.year || new Date().getFullYear(),
                    quality: movie.quality || 'HD',
                    rating: movie.rating || 0,
                    type: movie.type || 'movie'
                };
                
                debugLog('Mapped movie data:', movieData);
                return movieData;
            });

        debugLog(`Returning ${favorites.length} favorites for user:`, userId);
        debugLog('Final response data:', JSON.stringify(favorites));
        
        return responseHelper.successResponse(res, 'Favorites retrieved successfully', favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return responseHelper.serverErrorResponse(res, 'Failed to fetch favorites');
    }
};

// Add a movie to favorites
exports.addToFavorites = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        
        if (!userId) {
            console.error('User ID is missing in the request', req.user);
            return responseHelper.unauthorizedResponse(res, 'User ID is missing');
        }

        const { movieId, movieSlug } = req.body;

        debugLog('Request to add to favorites:', { userId, movieId, movieSlug });

        if (!movieId && !movieSlug) {
            return responseHelper.badRequestResponse(res, 'Movie ID or slug is required');
        }

        let movie;
        if (movieId) {
            movie = await Movie.findById(movieId);
        } else {
            movie = await Movie.findOne({ slug: movieSlug });
        }

        if (!movie) {
            debugLog('Movie not found:', { movieId, movieSlug });
            return responseHelper.notFoundResponse(res, 'Movie not found');
        }

        let favoritesList = await FavoritesList.findOne({ userId });
       
        if (!favoritesList) {
            try {
                favoritesList = new FavoritesList({
                    userId: userId,
                    movieIds: [movie._id]
                });
                
                const savedList = await favoritesList.save();
                debugLog('Created new favorites list:', { listId: savedList._id, moviesCount: savedList.movieIds.length });
                
                return responseHelper.successResponse(res, 'Đã Thêm Vào Danh Sách Yêu Thích', { added: true });
            } catch (saveError) {
                console.error('Error saving new favorites list:', saveError);
                return responseHelper.serverErrorResponse(res, 'Failed to create favorites list');
            }
        } else {
            const isMovieAlreadyInFavorites = favoritesList.movieIds.some(id => {
                const idString = id.toString();
                const movieIdString = movie._id.toString();
                const matches = idString === movieIdString;
                debugLog(`Comparing IDs: ${idString} vs ${movieIdString} => ${matches ? 'Match' : 'No match'}`);
                return matches;
            });

            if (isMovieAlreadyInFavorites) {
                return responseHelper.successResponse(res, 'Đã thêm vào danh sách yêu thíchthích', { exists: true, alreadyExists: true });
            }

            try {
                favoritesList.movieIds.push(movie._id);
                await favoritesList.save();
                debugLog('Added movie to existing favorites list, new count:', favoritesList.movieIds.length);
                
                return responseHelper.successResponse(res, 'Đã Thêm Vào Danh Sách Yêu Thích', { added: true });
            } catch (updateError) {
                console.error('Error updating favorites list:', updateError);
                return responseHelper.serverErrorResponse(res, 'Failed to update favorites list');
            }
        }
    } catch (error) {
        console.error('Error adding to favorites:', error);
        return responseHelper.serverErrorResponse(res, 'Failed to add to favorites');
    }
};

// Remove a movie from favorites
exports.removeFromFavorites = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const movieId = req.params.movieId;

        if (!movieId) {
            return responseHelper.badRequestResponse(res, 'Movie ID is required');
        }

        const favoritesList = await FavoritesList.findOne({ userId });

        if (!favoritesList) {
            return responseHelper.notFoundResponse(res, 'Favorites list not found');
        }

        favoritesList.movieIds = favoritesList.movieIds.filter(id => id.toString() !== movieId.toString());
        await favoritesList.save();

        debugLog('Removed movie from favorites list:', movieId);
        return responseHelper.successResponse(res, 'Đã có trong danh sách yêu thích', { removed: true });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        return responseHelper.serverErrorResponse(res, 'Failed to remove from favorites');
    }
};

// Check if a movie is in favorites
exports.checkFavoriteStatus = async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const { movieId, movieSlug } = req.query;

        if (!movieId && !movieSlug) {
            return responseHelper.badRequestResponse(res, 'Movie ID or slug is required');
        }

        let movie;
        if (movieId) {
            movie = await Movie.findById(movieId);
        } else {
            movie = await Movie.findOne({ slug: movieSlug });
        }

        if (!movie) {
            return responseHelper.notFoundResponse(res, 'Movie not found');
        }

        const favoritesList = await FavoritesList.findOne({ userId });

        if (!favoritesList) {
            return responseHelper.successResponse(res, 'No favorites list found', { isFavorite: false });
        }

        const isFavorite = favoritesList.movieIds.some(id => id.toString() === movie._id.toString());

        debugLog('Checked favorite status for movie:', movieId || movieSlug, 'Result:', isFavorite);
        return responseHelper.successResponse(res, 'Favorite status retrieved', { isFavorite });
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return responseHelper.serverErrorResponse(res, 'Failed to check favorite status');
    }
};