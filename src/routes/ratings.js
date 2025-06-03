const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authMiddleware = require('../middlewares/authMiddleware');

// Create or update a rating - requires authentication
router.post('/', authMiddleware.verifyToken, ratingController.createOrUpdateRating);

// Get all ratings for a specific movie
router.get('/movie/:movieId', ratingController.getMovieRatings);

// Get all ratings for a specific user
router.get('/user/:userId', ratingController.getUserRatings);

// Get a specific user's rating for a specific movie by slug
router.get('/user/:userId/movie/:movieSlug', ratingController.getUserMovieRating);

// Get rating statistics for a specific movie by slug
router.get('/stats/:movieSlug', ratingController.getMovieRatingStats);

// Delete a rating - requires authentication
router.delete('/:ratingId', authMiddleware.verifyToken, ratingController.deleteRating);

module.exports = router;