// scripts/addPremiumPackage.js
const mongoose = require('mongoose');
const { SubscriptionPackage } = require('../src/models/subscription');
const AccountType = require('../src/models/accountType');
const { connectDB } = require('../src/config/db');

/**
 * Script tạo các gói Premium với nhiều mức giá khác nhau
 */
async function addPremiumPackages() {
  try {
    await connectDB();
    console.log('Bắt đầu thêm các gói Premium...');

    // Tìm loại tài khoản Premium
    const premiumAccountType = await AccountType.findOne({ name: 'Premium' });
    
    if (!premiumAccountType) {
      console.error('Không tìm thấy loại tài khoản Premium');
      // Tạo AccountType Premium nếu chưa có
      const newAccountType = new AccountType({
        name: 'Premium',
        description: 'Tài khoản Premium với đầy đủ quyền lợi'
      });
      await newAccountType.save();
      console.log('Đã tạo loại tài khoản Premium mới!');
      premiumAccountTypeId = newAccountType._id;
    } else {
      premiumAccountTypeId = premiumAccountType._id;
    }

    // Danh sách các gói cần thêm
    const packages = [
      {
        name: 'Cơ bản',
        description: 'Không hiển thị quảng cáo ở màn hình chính',
        price: 10000,
        durationDays: 30,
        features: [
          'Không hiển thị quảng cáo ở màn hình chính',
          'Trải nghiệm giao diện tốt hơn',
          'Hỗ trợ trên mọi thiết bị'
        ],
        isActive: true,
        discount: 0
      },
      {
        name: 'Premium',
        description: 'Trải nghiệm không quảng cáo hoàn toàn khi xem phim',
        price: 15000,
        durationDays: 30,
        features: [
          'Không hiển thị quảng cáo ở màn hình chính',
          'Không hiển thị video quảng cáo khi bấm vào nút play để xem phim',
          'Trải nghiệm xem phim tốt nhất',
          'Hỗ trợ trên mọi thiết bị'
        ],
        isActive: true,
        discount: 0
      }
    ];

    // Thêm từng gói
    for (const packageData of packages) {
      // Kiểm tra xem gói đã tồn tại chưa
      const existingPackage = await SubscriptionPackage.findOne({ name: packageData.name });
      
      if (existingPackage) {
        console.log(`Gói "${packageData.name}" đã tồn tại. Bỏ qua.`);
        continue;
      }

      // Tạo gói mới
      const newPackage = new SubscriptionPackage({
        ...packageData,
        accountTypeId: premiumAccountTypeId
      });

      await newPackage.save();
      console.log(`Đã thêm gói Premium "${packageData.name}" thành công!`);
    }
    
    console.log('Hoàn tất thêm các gói Premium!');
    
  } catch (error) {
    console.error('Lỗi khi thêm gói Premium:', error);
  } finally {
    // Đóng kết nối database
    await mongoose.connection.close();
    console.log('Đã đóng kết nối database');
  }
}

// Thực thi function
addPremiumPackages();