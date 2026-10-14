// src/database/mongoose.js
// Kết nối cơ sở dữ liệu MongoDB Atlas (Hỗ trợ JSON Fallback nếu chưa có URI)

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

let isConnected = false;

async function connectDatabase() {
  if (!MONGODB_URI) {
    console.log('ℹ️ [DATABASE] MONGODB_URI chưa được cài trong .env -> Sử dụng JSON Storage an toàn làm Backend.');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('🍃 [DATABASE] Đã kết nối thành công tới MongoDB Atlas Database!');
    return true;
  } catch (err) {
    console.error('❌ [DATABASE] Lỗi kết nối MongoDB Atlas:', err.message);
    console.log('⚠️ [DATABASE] Tự động chuyển sang sử dụng JSON Storage làm Backend dự phòng.');
    isConnected = false;
    return false;
  }
}

function getDatabaseStatus() {
  return isConnected;
}

module.exports = { connectDatabase, getDatabaseStatus };
