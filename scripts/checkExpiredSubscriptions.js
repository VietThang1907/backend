/**
 * Script to check for expired subscriptions and downgrade users
 * Run this script with a scheduled task (e.g., cron job)
 */

const mongoose = require('mongoose');
const { UserSubscription } = require('../src/models/subscription');
const User = require('../src/models/user');
const config = require('../src/config/db');

// Connect to database
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for expired subscription check'))
.catch(err => console.error('MongoDB connection error:', err));

async function checkExpiredSubscriptions() {
  const now = new Date();
  console.log(`Running expired subscription check at: ${now.toISOString()}`);

  try {
    // Find active subscriptions that have expired
    const expiredSubscriptions = await UserSubscription.find({
      isActive: true,
      status: 'active',
      endDate: { $lt: now }
    }).populate('userId');

    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      console.log(`Processing expired subscription for user: ${subscription.userId?._id || subscription.userId}`);
      
      try {
        // Update subscription status
        subscription.isActive = false;
        subscription.status = 'expired';
        await subscription.save();
        
        // Find the default AccountType (Normal)
        const AccountType = require('../src/models/accountType');
        const normalAccountType = await AccountType.findOne({ name: 'Normal' });
        
        // Find the default Role (User)
        const Role = require('../src/models/role');
        const userRole = await Role.findOne({ name: 'User' });
        
        if (!normalAccountType) {
          console.error('Default account type (Normal) not found');
          continue;
        }
        
        // Update user status
        const updateData = {
          isPremium: false,
          subscriptionEndDate: null
        };
        
        // Set accountTypeId to Normal
        if (normalAccountType) {
          updateData.accountTypeId = normalAccountType._id;
        }
        
        // Set role_id to User if not admin or moderator
        if (userRole) {
          const user = await User.findById(subscription.userId).populate('role_id');
          // Only downgrade role if it's not an admin or moderator
          if (!user.role_id || (user.role_id.name !== 'Admin' && user.role_id.name !== 'Moderator')) {
            updateData.role_id = userRole._id;
          }
        }
        
        // Update the user
        const updatedUser = await User.findByIdAndUpdate(
          subscription.userId,
          updateData,
          { new: true }
        );
        
        console.log(`Successfully downgraded user ${subscription.userId} to normal account`);
      } catch (err) {
        console.error(`Error processing subscription ID ${subscription._id}:`, err);
      }
    }

    console.log('Expired subscription check completed');
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  } finally {
    // Disconnect from database after processing
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the function
checkExpiredSubscriptions();