const Advertisement = require('../models/advertisement');

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const { type, page = 1, limit = 10, active } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (type) filter.type = type;
    if (active !== undefined) filter.active = active === 'true';
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };
    
    const advertisements = await Advertisement.find(filter)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort);
    
    const totalAds = await Advertisement.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: advertisements.length,
      total: totalAds,
      totalPages: Math.ceil(totalAds / options.limit),
      currentPage: options.page,
      advertisements
    });
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching advertisements',
      error: error.message
    });
  }
};

// Get advertisement by ID
exports.getAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      advertisement
    });
  } catch (error) {
    console.error('Error fetching advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching advertisement',
      error: error.message
    });
  }
};

// Create a new advertisement
exports.createAdvertisement = async (req, res) => {
  try {
    console.log('Creating advertisement with data:', req.body);
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'advertiser', 'content', 'link', 'startDate', 'endDate'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }
    
    // Create advertisement
    const advertisement = new Advertisement(req.body);
    await advertisement.save();
    
    console.log('Advertisement created successfully:', advertisement);
    
    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      advertisement
    });
  } catch (error) {
    console.error('Error creating advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating advertisement',
      error: error.message
    });
  }
};

// Update advertisement
exports.updateAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      advertisement
    });
  } catch (error) {
    console.error('Error updating advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating advertisement',
      error: error.message
    });
  }
};

// Delete advertisement
exports.deleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndDelete(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting advertisement',
      error: error.message
    });
  }
};

// Get random advertisement by type
exports.getRandomAd = async (req, res) => {
  try {
    const { type = 'video', limit } = req.query;
    
    // Check if we need to return multiple ads
    if (limit && parseInt(limit) > 1) {
      const ads = await Advertisement.getMultipleRandomAds(type, parseInt(limit));
      
      if (!ads || ads.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active advertisements found for this type'
        });
      }
      
      // Log impressions for each ad
      for (const ad of ads) {
        await ad.logImpression();
      }
      
      res.status(200).json({
        success: true,
        advertisements: ads
      });
    } else {
      // Original behavior - get a single ad
      const ad = await Advertisement.getRandomAd(type);
      
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'No active advertisements found for this type'
        });
      }
      
      // Log impression
      await ad.logImpression();
      
      res.status(200).json({
        success: true,
        advertisement: ad
      });
    }
  } catch (error) {
    console.error('Error fetching random advertisement(s):', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching random advertisement(s)',
      error: error.message
    });
  }
};

// Log ad view
exports.logAdView = async (req, res) => {
  try {
    const { adId } = req.body;
    
    if (!adId) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement ID is required'
      });
    }
    
    const ad = await Advertisement.findById(adId);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    // Log impression
    await ad.logImpression();
    
    res.status(200).json({
      success: true,
      message: 'Advertisement view logged successfully'
    });
  } catch (error) {
    console.error('Error logging advertisement view:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging advertisement view',
      error: error.message
    });
  }
};

// Log ad click
exports.logAdClick = async (req, res) => {
  try {
    const { adId } = req.body;
    
    if (!adId) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement ID is required'
      });
    }
    
    const ad = await Advertisement.findById(adId);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    // Log click
    await ad.logClick();
    
    res.status(200).json({
      success: true,
      message: 'Advertisement click logged successfully'
    });
  } catch (error) {
    console.error('Error logging advertisement click:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging advertisement click',
      error: error.message
    });
  }
};

// Log ad skip
exports.logAdSkip = async (req, res) => {
  try {
    const { adId, skipTime } = req.body;
    
    if (!adId) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement ID is required'
      });
    }
    
    const ad = await Advertisement.findById(adId);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    // Log skip
    await ad.logSkip();
    
    res.status(200).json({
      success: true,
      message: 'Advertisement skip logged successfully',
      skipTime
    });
  } catch (error) {
    console.error('Error logging advertisement skip:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging advertisement skip',
      error: error.message
    });
  }
};