// src/routes/adminRatingRoutes.js
const express = require('express');
const router = express.Router();
const Rating = require('../models/rating');
const Movie = require('../models/movie');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');
const mongoose = require('mongoose');
const responseHelper = require('../utils/responseHelper');

// Apply authentication and admin-only middleware to all routes
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * GET /admin/ratings/:movieId
 * Get all ratings and stats for a specific movie by ID for admin panel
 */
router.get('/ratings/:movieId', async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
            return responseHelper.badRequestResponse(res, "Valid Movie ID is required");
        }

        // Find movie first to verify it exists
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return responseHelper.notFoundResponse(res, "Movie not found");
        }

        // Get all ratings for this movie with user details
        const ratings = await Rating.find({ movieId: mongoose.Types.ObjectId(movieId) })
            .populate('userId', 'username email avatar fullname')
            .sort({ createdAt: -1 });

        // Calculate rating statistics
        const totalRatings = ratings.length;
        const averageRating = totalRatings > 0 
            ? ratings.reduce((sum, item) => sum + item.rating, 0) / totalRatings 
            : 0;

        // Calculate distribution of ratings (how many 1s, 2s, etc.)
        const userRatingsStats = {};
        for (let i = 1; i <= 10; i++) {
            userRatingsStats[i] = 0;
        }

        ratings.forEach(rating => {
            userRatingsStats[rating.rating] = (userRatingsStats[rating.rating] || 0) + 1;
        });

        return responseHelper.successResponse(res, "Rating data retrieved successfully", {
            ratings,
            ratingCount: totalRatings,
            averageRating,
            userRatingsStats
        });
    } catch (error) {
        console.error('Error fetching ratings for admin panel:', error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
});

/**
 * POST /admin/ratings/update-movie-ratings
 * Update a movie's aggregate rating based on all user ratings
 */
router.post('/ratings/update-movie-ratings', async (req, res) => {
    try {
        const { movieId } = req.body;

        if (!movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
            return responseHelper.badRequestResponse(res, "Valid Movie ID is required");
        }

        // Find movie first to verify it exists
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return responseHelper.notFoundResponse(res, "Movie not found");
        }

        // Get all ratings for this movie
        const ratings = await Rating.find({ movieId: mongoose.Types.ObjectId(movieId) });
        
        const totalRatings = ratings.length;
        const averageRating = totalRatings > 0 
            ? ratings.reduce((sum, item) => sum + item.rating, 0) / totalRatings 
            : 0;

        // Update movie with new rating data
        movie.rating = averageRating;
        movie.vote_count = totalRatings;
        await movie.save();

        return responseHelper.successResponse(res, "Movie ratings updated successfully", {
            movieId,
            rating: averageRating,
            voteCount: totalRatings
        });
    } catch (error) {
        console.error('Error updating movie ratings:', error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
});

/**
 * GET /admin/ratings/sync-all
 * Sync all movies' ratings with their user ratings
 */
router.get('/ratings/sync-all', async (req, res) => {
    try {
        // Get all movies
        const movies = await Movie.find({});
        const results = [];

        for (const movie of movies) {
            // For each movie, get all its ratings
            const ratings = await Rating.find({ movieId: movie._id });
            
            const totalRatings = ratings.length;
            const averageRating = totalRatings > 0 
                ? ratings.reduce((sum, item) => sum + item.rating, 0) / totalRatings 
                : 0;
            
            // Update movie with new rating data
            movie.rating = averageRating;
            movie.vote_count = totalRatings;
            await movie.save();
            
            results.push({
                movieId: movie._id,
                name: movie.name,
                rating: averageRating,
                voteCount: totalRatings
            });
        }

        return responseHelper.successResponse(res, "All movie ratings synchronized successfully", {
            count: results.length,
            results
        });
    } catch (error) {
        console.error('Error synchronizing all movie ratings:', error);
        return responseHelper.serverErrorResponse(res, error.message);
    }
});

module.exports = router;
