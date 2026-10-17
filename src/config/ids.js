// src/config/ids.js
// Quản lý tập trung các ID cấu hình (Kênh log, Admin ID)

module.exports = {
  // Kênh ghi log tập trung của bot (quản trị, chống spam/raid, theo dõi tin nhắn)
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1559750487299850331',

  // Kênh thông báo trạng thái kết nối, ngắt mạng (DC) và khởi động trực tuyến
  STATUS_LOG_CHANNEL_ID: process.env.STATUS_LOG_CHANNEL_ID || '1547449482835394640',

  // ID Admin cần tag khi bot khởi động hoặc kết nối lại
  NOTIFY_ADMIN_ID: '875358286487097395',

  // Danh sách Admin có quyền tối cao
  ADMIN_IDS: [
    process.env.OWNER_ID || '875358286487097395'
  ].filter(Boolean)
};
