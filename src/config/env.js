// src/config/env.js
// Kiểm tra và quản lý biến môi trường bắt buộc

require('dotenv').config();

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ [LỖI KHỞI ĐỘNG] Thiếu biến môi trường bắt buộc trong file .env: ${missing.join(', ')}`);
  console.error('Vui lòng kiểm tra file .env hoặc tạo từ .env.example!');
  process.exit(1);
}

module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  MONGODB_URI: process.env.MONGODB_URI || null,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1559750487299850331',
  NODE_ENV: process.env.NODE_ENV || 'production'
};
