const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { verifyToken } = require('../middlewares/authMiddleware');

// All watchlist routes require authentication
router.use(verifyToken);

// Get watchlist for current user
router.get('/', watchlistController.getWatchlist);

// Add movie to watchlist
router.post('/add', watchlistController.addToWatchlist);

// Check if movie is in watchlist
router.get('/check/:movieId', watchlistController.checkWatchlist);

// Remove movie from watchlist
router.delete('/remove/:movieId', watchlistController.removeFromWatchlist);

// Clear watchlist
router.delete('/clear', watchlistController.clearWatchlist);

module.exports = router;