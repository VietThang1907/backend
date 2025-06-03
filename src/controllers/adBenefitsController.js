const { UserSubscription } = require("../models/subscription");
const responseHelper = require("../utils/responseHelper");

/**
 * Get ad visibility benefits based on user's subscription
 */
exports.getAdBenefits = async (req, res) => {  
  try {
    // Check if user object exists and get user ID
    if (!req.user) {
      console.log('[AD BENEFITS] No user found in request');
      return responseHelper.unauthorizedResponse(res, "Authentication required");
    }
    
    // Get authenticated user's ID - check multiple possible locations
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.log('[AD BENEFITS] User ID not found in request:', req.user);
      return responseHelper.unauthorizedResponse(res, "User ID not found");
    }
    
    console.log(`[AD BENEFITS] Checking ad benefits for user: ${userId}`);
    
    // Find the user's active subscription
    const userSubscription = await UserSubscription.findOne({
      userId,
      isActive: true,
      status: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).populate('packageId');
    
    console.log(`[AD BENEFITS] Found subscription:`, userSubscription ? `ID: ${userSubscription._id}` : 'None');
    
    if (!userSubscription) {
      // No active subscription
      return responseHelper.successResponse(res, "User has no active subscription", {
        hideHomepageAds: false,
        hideVideoAds: false,
        packageType: null,
        hasActiveSubscription: false
      });
    }
    
    // Get package type to determine ad benefits
    const packageId = userSubscription.packageId._id.toString();
    
    let hideHomepageAds = false;
    let hideVideoAds = false;    // Apply benefits based on package type
    if (packageId) {
      console.log(`[AD BENEFITS] Package ID: ${packageId}, Name: ${userSubscription.packageId.name}`);
      console.log(`[AD BENEFITS] ENV variables: PACKAGE_TYPE_1=${process.env.PACKAGE_TYPE_1}, PACKAGE_TYPE_2=${process.env.PACKAGE_TYPE_2}`);
        // Get package name and normalize it for better comparison
      const packageName = (userSubscription.packageId.name || '').toLowerCase();
      
      // HARDCODE ID GÓI PREMIUM 15K từ Database
      const PREMIUM_PACKAGE_ID = '682f7d849c310399aa715c9d';
      
      console.log(`[AD BENEFITS] Checking package ID: ${packageId}`);
      console.log(`[AD BENEFITS] Is Premium 15k Package? ${packageId === PREMIUM_PACKAGE_ID}`);
      
      // Package 1: Hide only homepage ads - Basic gói 10k (Cơ bản)
      if ((process.env.PACKAGE_TYPE_1 && packageId === process.env.PACKAGE_TYPE_1) || 
          packageName.includes('basic') || packageId === '682f7d849c310399aa715c98' || 
          packageName.includes('standard')) {
        console.log(`[AD BENEFITS] Applying Basic package benefits (hide homepage ads only)`);
        hideHomepageAds = true;
      }
      // Package 2: Hide all ads (homepage + video) - Premium gói 15k ID: 682f7d849c310399aa715c9d
      else if ((process.env.PACKAGE_TYPE_2 && packageId === process.env.PACKAGE_TYPE_2) || 
               packageId === PREMIUM_PACKAGE_ID ||
               packageName.includes('premium') || 
               packageName.includes('gold') ||
               packageName.includes('platinum') ||
               packageName.includes('vip') ||
               (packageName.includes('trải nghiệm') && packageName.includes('không quảng cáo'))) {
        console.log(`[AD BENEFITS] Applying Premium package benefits (hide all ads)`);
        hideHomepageAds = true;
        hideVideoAds = true;
      } 
      // Fallback - if no specific matching, grant basic ad hiding benefits
      else {
        console.log(`[AD BENEFITS] No exact package match found - applying default benefits (hiding homepage ads)`);
        hideHomepageAds = true;
      }
    }
    
    return responseHelper.successResponse(res, "Ad benefits retrieved successfully", {
      hideHomepageAds,
      hideVideoAds,
      packageType: packageId,
      hasActiveSubscription: true
    });
  } catch (error) {
    console.error("Error in getAdBenefits:", error);
    return responseHelper.serverErrorResponse(res, "Cannot retrieve ad benefits");
  }
};
