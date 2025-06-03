const express = require('express');
const router = express.Router();
const movieViewController = require('../controllers/movieViewController');
const authMiddleware = require('../middlewares/authMiddleware');

// Record a view when a user watches a movie - works for both logged in and anonymous users
router.post('/record', movieViewController.recordMovieView);

// Get the most viewed movies (default: for today)
router.get('/most-viewed', movieViewController.getMostViewedMovies);

// Get view statistics for a specific movie
router.get('/stats/:movieId', movieViewController.getMovieViewStats);

module.exports = router;