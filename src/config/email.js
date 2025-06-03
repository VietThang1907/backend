// src/config/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Tạo transporter để gửi email
let transporterConfig;

// Kiểm tra xem có cấu hình SMTP tùy chỉnh không
if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    // Sử dụng cấu hình SMTP tùy chỉnh
    transporterConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };
} else {
    // Sử dụng Gmail mặc định
    transporterConfig = {
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };
}

const transporter = nodemailer.createTransport(transporterConfig);

// Kiểm tra kết nối với máy chủ email
const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('Email service is ready to send messages');
        return true;
    } catch (error) {
        console.error('Email service setup failed:', error);
        return false;
    }
};

module.exports = {
    transporter,
    verifyEmailConfig
};
