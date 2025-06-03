const mongoose = require('mongoose');
const Rating = require('../models/rating');
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

// Create a new rating or update if one exists
exports.createOrUpdateRating = async (req, res) => {
    try {
        const { userId, movieId, movieSlug, rating } = req.body;
        
        if (!userId || (!movieId && !movieSlug) || !rating) {
            return responseHelper.badRequestResponse(res, "Missing required fields");
        }
        
        // Validate rating value (1-10)
        if (rating < 1 || rating > 10) {
            return responseHelper.badRequestResponse(res, "Rating must be between 1 and 10");
        }
        
        let movie;
        if (movieSlug) {
            movie = await Movie.findOne({ slug: movieSlug });
            if (!movie) {
                return responseHelper.notFoundResponse(res, "Movie not found");
            }
        }
        
        const movieObjectId = movieId ? mongoose.Types.ObjectId(movieId) : movie._id;
        
        // Check if a rating already exists for this user and movie
        let userRating = await Rating.findOne({ 
            userId: mongoose.Types.ObjectId(userId),
            movieId: movieObjectId 
        });
        
        if (userRating) {
            // Update existing rating
            userRating.rating = rating;
            await userRating.save();
        } else {
            // Create new rating with required movieSlug field
            userRating = new Rating({
                userId: mongoose.Types.ObjectId(userId),
                movieId: movieObjectId,
                movieSlug: movieSlug, // Make sure to include the movieSlug field
                rating
            });
            await userRating.save();
        }
        
        // Calculate new average rating
        const ratingStats = await calculateMovieRating(movieObjectId);
        
        // Update the movie document with new rating information
        if (movie) {
            // This helps maintain the rating in the movie document for better retrieval later
            movie.rating = ratingStats.averageRating;
            movie.rating_count = ratingStats.ratingCount;
            await movie.save();
        }
        
        return responseHelper.successResponse(res, "Rating saved successfully", {
            rating: userRating,
            averageRating: ratingStats.averageRating,
            ratingCount: ratingStats.ratingCount,
            success: true
        });
    } catch (error) {
        console.error("Error in createOrUpdateRating:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Get all ratings for a movie
exports.getMovieRatings = async (req, res) => {
    try {
        const { movieId } = req.params;
        
        if (!movieId) {
            return responseHelper.badRequestResponse(res, "Movie ID is required");
        }        const ratings = await Rating.find({ 
            movieId: mongoose.Types.ObjectId(movieId) 
        }).populate('userId', 'fullname email avatar');
        return responseHelper.successResponse(res, "Ratings retrieved successfully", { 
            ratings,
            success: true
        });
    } catch (error) {
        console.error("Error in getMovieRatings:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Get all ratings for a user
exports.getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return responseHelper.badRequestResponse(res, "User ID is required");
        }
        
        const ratings = await Rating.find({ 
            userId: mongoose.Types.ObjectId(userId) 
        }).populate({
            path: 'movieId',
            select: 'name thumb_url poster_url slug'
        });
        
        // Format the response for better frontend consumption
        const formattedRatings = ratings.map(rating => ({
            id: rating._id,
            rating: rating.rating,
            createdAt: rating.createdAt,
            movie: rating.movieId ? {
                id: rating.movieId._id,
                name: rating.movieId.name,
                thumb_url: rating.movieId.thumb_url,
                poster_url: rating.movieId.poster_url,
                slug: rating.movieId.slug
            } : null
        }));
        
        return responseHelper.successResponse(res, "User ratings retrieved successfully", { 
            ratings: formattedRatings,
            success: true
        });
    } catch (error) {
        console.error("Error in getUserRatings:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Get rating statistics (aggregated data) for a movie
exports.getMovieRatingStats = async (req, res) => {
    try {
        const { movieSlug } = req.params;
        
        if (!movieSlug) {
            return responseHelper.badRequestResponse(res, "Movie slug is required");
        }
        
        // Find the movie by slug
        const movie = await Movie.findOne({ slug: movieSlug });
        
        if (!movie) {
            return responseHelper.notFoundResponse(res, "Movie not found");
        }
        
        // Get the combined movie rating
        const ratingStats = await calculateMovieRating(movie._id);
        
        // Get distribution of user ratings (how many 1s, 2s, etc.)
        const ratingDistribution = await Rating.aggregate([
            { $match: { movieId: movie._id } },
            { $group: { _id: "$rating", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        // Format the distribution as an object
        const userRatingsStats = {};
        for (let i = 1; i <= 10; i++) {
            userRatingsStats[i] = 0;
        }
        
        ratingDistribution.forEach(item => {
            userRatingsStats[item._id] = item.count;
        });
        
        return responseHelper.successResponse(res, "Rating statistics retrieved successfully", {
            averageRating: ratingStats.averageRating,
            ratingCount: ratingStats.ratingCount,
            userRatingsStats,
            movieRating: movie.rating, // Add original movie rating for comparison
            movieRatingCount: movie.rating_count, // Add original movie rating count
            success: true
        });
    } catch (error) {
        console.error("Error in getMovieRatingStats:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Delete a rating
exports.deleteRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        
        if (!ratingId) {
            return responseHelper.badRequestResponse(res, "Rating ID is required");
        }
        
        const rating = await Rating.findById(ratingId);
        
        if (!rating) {
            return responseHelper.notFoundResponse(res, "Rating not found");
        }
        
        // Check if the rating belongs to the current user
        if (rating.userId.toString() !== req.user._id.toString()) {
            return responseHelper.forbiddenResponse(res, "Not authorized to delete this rating");
        }
        
        await Rating.findByIdAndDelete(ratingId);
        
        // Update the movie's average rating
        const ratingStats = await calculateMovieRating(rating.movieId);
        
        // Also update the movie document with new rating for better retrieval
        const movie = await Movie.findById(rating.movieId);
        if (movie) {
            movie.rating = ratingStats.averageRating;
            movie.rating_count = ratingStats.ratingCount;
            await movie.save();
        }
        
        return responseHelper.successResponse(res, "Rating deleted successfully", { 
            averageRating: ratingStats.averageRating,
            ratingCount: ratingStats.ratingCount,
            success: true
        });
    } catch (error) {
        console.error("Error in deleteRating:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Get a specific user's rating for a specific movie by slug
exports.getUserMovieRating = async (req, res) => {
    try {
        const { userId, movieSlug } = req.params;
        
        if (!userId || !movieSlug) {
            return responseHelper.badRequestResponse(res, "User ID and movie slug are required");
        }
        
        // Find the movie by slug first
        const movie = await Movie.findOne({ slug: movieSlug });
        
        if (!movie) {
            return responseHelper.notFoundResponse(res, "Movie not found");
        }
        
        // Now find the user's rating for this movie
        const userRating = await Rating.findOne({ 
            userId: mongoose.Types.ObjectId(userId),
            movieId: movie._id
        });
        
        if (!userRating) {
            return responseHelper.successResponse(res, "No rating found for this user and movie", {
                rating: 0,
                hasRated: false
            });
        }
        
        return responseHelper.successResponse(res, "User rating retrieved successfully", {
            rating: userRating.rating,
            ratingId: userRating._id,
            movieId: movie._id,
            movieSlug: movieSlug,
            hasRated: true
        });
    } catch (error) {
        console.error("Error in getUserMovieRating:", error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
};

// Helper function to calculate average rating for a movie combining both default rating and user ratings
async function calculateMovieRating(movieId) {
    try {
        // Get the movie to access its default rating
        const movie = await Movie.findById(movieId);
        
        if (!movie) {
            throw new Error("Movie not found");
        }
        
        // Get all user ratings for this movie - fix potential ObjectId comparison issue
        const userRatings = await Rating.find({ 
            movieId: mongoose.Types.ObjectId(movieId.toString())
        });
        
        const userRatingCount = userRatings.length;
        debugLog(`Found ${userRatingCount} user ratings for movie ${movie.name}`);
        
        // If there are no user ratings, return the default rating from the movie
        if (userRatingCount === 0) {
            // Use TMDB rating if available, or default to 7/10
            const movieRating = movie.tmdb?.vote_average || movie.rating || 7;
            const movieRatingCount = movie.tmdb?.vote_count || movie.rating_count || 0;
            
            // Convert TMDB rating (0-10) to our scale (1-10) if needed
            const normalizedRating = movieRating > 0 ? movieRating : 7;
            
            return {
                averageRating: normalizedRating,
                ratingCount: movieRatingCount
            };
        }
        
        // Calculate sum of all user ratings
        const userRatingSum = userRatings.reduce((sum, item) => sum + item.rating, 0);
        
        // Get the default movie rating from TMDB or set a default
        const movieRating = movie.tmdb?.vote_average || movie.rating || 7;
        const movieRatingCount = movie.tmdb?.vote_count || movie.rating_count || 0;
        
        // Calculate weighted average combining both default rating and user ratings
        const totalCount = movieRatingCount + userRatingCount;
        let combinedRating;
        
        if (movieRatingCount > 0) {
            // Weighted average
            combinedRating = ((movieRating * movieRatingCount) + (userRatingSum)) / totalCount;
        } else {
            // Just use user ratings if no default rating
            combinedRating = userRatingSum / userRatingCount;
        }
        
        debugLog(`Calculated rating: ${combinedRating.toFixed(1)}, total count: ${totalCount}`);
        
        return {
            averageRating: combinedRating,
            ratingCount: totalCount
        };
    } catch (error) {
        console.error("Error calculating movie rating:", error);
        throw error;
    }
};