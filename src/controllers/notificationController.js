const Notification = require('../models/notification');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Get all notifications for admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipientType: 'admin',
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    return successResponse(res, 'Notifications retrieved successfully', notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return errorResponse(res, 'Failed to get notifications', 500);
  }
};

// Mark a notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }
    
    notification.isRead = true;
    await notification.save();
    
    return successResponse(res, 'Notification marked as read', notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return errorResponse(res, 'Failed to mark notification as read', 500);
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType: 'admin', isRead: false },
      { isRead: true }
    );
    
    return successResponse(res, 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return errorResponse(res, 'Failed to mark all notifications as read', 500);
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }
    
    return successResponse(res, 'Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting notification:', error);
    return errorResponse(res, 'Failed to delete notification', 500);
  }
};

// Create a notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, recipientType, entity } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type,
      recipientType: recipientType || 'admin',
      entity,
      isRead: false,
    });
    
    await notification.save();
    
    // Emit notification event (will be implemented with WebSocket)
    
    return successResponse(res, 'Notification created successfully', notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return errorResponse(res, 'Failed to create notification', 500);
  }
};