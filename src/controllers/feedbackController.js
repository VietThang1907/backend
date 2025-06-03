const Feedback = require('../models/feedback');
const User = require('../models/user');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// Người dùng gửi feedback
exports.submitFeedback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, subject, message } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Tạo feedback mới
    const newFeedback = new Feedback({
      name,
      email,
      subject: subject || 'Góp ý từ người dùng',
      message,
      user: req.user ? req.user._id : null
    });

    // Lưu feedback vào database
    await newFeedback.save();

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi góp ý! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.',
      feedback: newFeedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Lấy tất cả feedback (cho admin)
exports.getAllFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const status = req.query.status;
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Tạo query filter
    const filter = {};
    if (status && ['pending', 'processed', 'resolved'].includes(status)) {
      filter.status = status;
    }
    
    // Tìm kiếm
    if (req.query.search) {
      const search = req.query.search;
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Tạo sort object
    const sort = {};
    sort[sortField] = sortOrder;
    
    // Đếm tổng số feedback
    const total = await Feedback.countDocuments(filter);
      // Lấy feedback với phân trang và sắp xếp
    const feedbacks = await Feedback.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name fullName email avatar') // Thêm trường avatar
      .lean();
    
    const totalPages = Math.ceil(total / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error getting all feedback:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Lấy chi tiết một feedback
exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    
    const feedback = await Feedback.findById(id).populate('user', 'name fullName email avatar');
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy góp ý' });
    }
    
    // Đánh dấu đã đọc nếu chưa
    if (!feedback.isRead) {
      feedback.isRead = true;
      await feedback.save();
    }
    
    return res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error getting feedback by id:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Cập nhật trạng thái feedback
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    
    // Kiểm tra status hợp lệ
    if (status && !['pending', 'processed', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    
    const feedback = await Feedback.findById(id);
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy góp ý' });
    }
    
    // Cập nhật thông tin
    if (status) feedback.status = status;
    if (adminResponse !== undefined) feedback.adminResponse = adminResponse;
    
    await feedback.save();
    
    return res.status(200).json({
      success: true,
      message: 'Cập nhật thành công',
      data: feedback
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Xóa feedback
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    
    const result = await Feedback.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy góp ý' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Xóa góp ý thành công'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Lấy số lượng feedback theo trạng thái
exports.getFeedbackStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Chuyển từ mảng thành đối tượng
    const result = {
      pending: 0,
      processed: 0,
      resolved: 0,
      total: 0
    };
    
    stats.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });
    
    // Số lượng chưa đọc
    const unreadCount = await Feedback.countDocuments({ isRead: false });
    result.unread = unreadCount;
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};