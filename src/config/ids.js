// src/config/ids.js
// Quản lý tập trung các ID cấu hình (Kênh log, Admin ID)

module.exports = {
  // Kênh ghi log tập trung của bot (quản trị, chống spam/raid, theo dõi tin nhắn)
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '1559750487299850331',

  // Kênh thông báo trạng thái kết nối, ngắt mạng (DC) và khởi động trực tuyến
  STATUS_LOG_CHANNEL_ID: process.env.STATUS_LOG_CHANNEL_ID || '1547449482835394640',

  // ID Admin cần tag khi bot khởi động hoặc kết nối lại
  NOTIFY_ADMIN_ID: '875358286487097395',

  // Kênh điều hướng khi nhắn tin nhầm vào các kênh log
  REDIRECT_SETTING_CHANNEL_ID: process.env.REDIRECT_SETTING_CHANNEL_ID || '1447095306079698984',

  // Danh sách các kênh nhật ký / log cần bảo vệ khỏi tin nhắn chat thường
  LOG_CHANNELS: [
    '1559750487299850331', // #👑︱tiara-bot-log
    '1547449482835394640', // #🚨︱bot-health-error
    '1560968766173614150', // #🛡️︱mod-chat-log
    '1560968768161579120', // #👥︱member-voice-log
    '1560968770221117511', // #🤖︱bot-activity-log
    '1543841691541180546', // #🎵︱music-room-log
    '1543117987148603473'  // #🛠️︱bot-feedback-log
  ],

  // Danh sách Admin có quyền tối cao
  ADMIN_IDS: [
    process.env.OWNER_ID || '875358286487097395'
  ].filter(Boolean)
};
