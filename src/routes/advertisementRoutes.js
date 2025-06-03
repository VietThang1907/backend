const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisementController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Public routes
router.get('/random', advertisementController.getRandomAd);

// Public routes for accessing ads
router.get('/', advertisementController.getAllAdvertisements);
router.get('/:id', advertisementController.getAdvertisementById);

// Routes requiring authentication for tracking 
// Temporarily comment out authentication for debugging
// router.use(isAuthenticated);
router.post('/view', advertisementController.logAdView);
router.post('/click', advertisementController.logAdClick);
router.post('/skip', advertisementController.logAdSkip);

// Admin-only routes for modifying data
// Temporarily remove admin middleware for debugging
router.post('/', advertisementController.createAdvertisement);
router.put('/:id', advertisementController.updateAdvertisement);
router.delete('/:id', advertisementController.deleteAdvertisement);

module.exports = router;