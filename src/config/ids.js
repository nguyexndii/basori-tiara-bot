// src/config/ids.js
// Quản lý tập trung các ID cấu hình (Kênh log, Admin ID)

module.exports = {
  // Kênh ghi log tập trung của bot (quản trị, chống spam/raid, lỗi hệ thống)
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1559750487299850331',

  // Danh sách Admin có quyền tối cao
  ADMIN_IDS: [
    process.env.OWNER_ID || ''
  ].filter(Boolean)
};
