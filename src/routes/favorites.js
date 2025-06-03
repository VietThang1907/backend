const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const authMiddleware = require('../middlewares/authMiddleware');

// All favorites routes require authentication
router.use(authMiddleware.verifyToken);

// Get all favorites for the logged-in user
router.get('/', favoritesController.getFavorites);

// Add a movie to favorites
router.post('/', favoritesController.addToFavorites);

// Remove a movie from favorites
router.delete('/:movieId', favoritesController.removeFromFavorites);

// Check if a movie is in favorites
router.get('/check', favoritesController.checkFavoriteStatus);

module.exports = router;