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

// Xử lý danh sách API Key Gemini
const rawGeminiKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const geminiKeys = rawGeminiKeys
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

// Xử lý danh sách Owner/Admin IDs
const rawAdminIds = process.env.OWNER_ADMIN_IDS || process.env.OWNER_ID || '875358286487097395';
const ownerAdminIds = rawAdminIds
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  MONGODB_URI: process.env.MONGODB_URI || null,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1559750487299850331',
  ADMIN_PROMPT_CHANNEL_ID: process.env.ADMIN_PROMPT_CHANNEL_ID || '1559786977040011284',
  OWNER_ADMIN_IDS: ownerAdminIds,
  GEMINI_API_KEYS: geminiKeys,
  NODE_ENV: process.env.NODE_ENV || 'production'
};
