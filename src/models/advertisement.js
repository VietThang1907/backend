const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['video', 'banner_top', 'banner_bottom'],
    default: 'video'
  },
  advertiser: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    // For video ads: video URL, for banner ads: image URL
    type: String,
    required: true
  },
  thumbnail: {
    // Optional thumbnail for video ads
    type: String,
    default: null
  },
  link: {
    // Click destination URL
    type: String,
    required: true
  },
  duration: {
    // For video ads only (in seconds)
    type: Number,
    default: 15
  },
  active: {
    type: Boolean,
    default: true
  },
  impressions: {
    // Number of times this ad has been shown
    type: Number,
    default: 0
  },
  clicks: {
    // Number of clicks on this ad
    type: Number,
    default: 0
  },
  skips: {
    // Number of times this ad was skipped (video ads)
    type: Number,
    default: 0
  },  startDate: {
    // When this ad campaign starts
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    // When this ad campaign ends
    type: Date,
    required: true,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // Default 30 days from now
  }
}, {
  timestamps: true
});

// Add index for efficient querying
advertisementSchema.index({ type: 1, active: 1 });

// Virtual for checking if the ad is currently active based on dates
advertisementSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.active && 
         now >= this.startDate && 
         now <= this.endDate;
});

// Add statics to easily fetch ads by type
advertisementSchema.statics.getRandomAd = async function(type = 'video') {
  const now = new Date();
  const ads = await this.find({
    type,
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });

  if (!ads || ads.length === 0) return null;
  
  // Return a random ad from the active ones
  const randomIndex = Math.floor(Math.random() * ads.length);
  return ads[randomIndex];
};

// Add statics to fetch multiple random ads by type
advertisementSchema.statics.getMultipleRandomAds = async function(type = 'video', limit = 1) {
  const now = new Date();
  // Find all ads that match the criteria
  const availableAds = await this.find({
    type,
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });

  if (!availableAds || availableAds.length === 0) return [];
  
  // If we have fewer ads than requested, return all available ads
  if (availableAds.length <= limit) return availableAds;
  
  // Get random unique ads up to the limit
  const selectedAds = [];
  const availableIndexes = [...Array(availableAds.length).keys()]; // Create array of all indexes
  
  // Select random ads until we reach the limit or run out of ads
  while (selectedAds.length < limit && availableIndexes.length > 0) {
    const randomPosition = Math.floor(Math.random() * availableIndexes.length);
    const randomIndex = availableIndexes[randomPosition];
    
    // Remove the selected index to avoid duplicates
    availableIndexes.splice(randomPosition, 1);
    selectedAds.push(availableAds[randomIndex]);
  }
  
  return selectedAds;
};

// Add method to increment impression count
advertisementSchema.methods.logImpression = async function() {
  this.impressions += 1;
  await this.save();
  return this;
};

// Add method to increment click count
advertisementSchema.methods.logClick = async function() {
  this.clicks += 1;
  await this.save();
  return this;
};

// Add method to increment skip count
advertisementSchema.methods.logSkip = async function() {
  this.skips += 1;
  await this.save();
  return this;
};

const Advertisement = mongoose.model('Advertisement', advertisementSchema);

module.exports = Advertisement;