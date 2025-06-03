/**
 * Cài đặt các cron job cho hệ thống
 * Được gọi từ server.js khi khởi động
 */

const cron = require('node-cron');
const path = require('path');
const { exec } = require('child_process');
const logger = console;

function setupCronJobs() {
  logger.log('Setting up cron jobs...');

  // Kiểm tra các đăng ký hết hạn vào lúc 0h mỗi ngày (00:00)
  cron.schedule('0 0 * * *', () => {
    logger.log(`Running scheduled expired subscription check at ${new Date().toISOString()}`);
    
    // Đường dẫn tới script kiểm tra
    const scriptPath = path.join(__dirname, '../scripts/checkExpiredSubscriptions.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error executing subscription check script: ${error.message}`);
        return;
      }
      
      if (stderr) {
        logger.error(`Script stderr: ${stderr}`);
      }
      
      logger.log(`Subscription check completed: ${stdout}`);
    });
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh" // Múi giờ Việt Nam
  });

  logger.log('Cron jobs setup completed.');
}

module.exports = { setupCronJobs };