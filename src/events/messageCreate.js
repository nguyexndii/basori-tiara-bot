// src/events/messageCreate.js
// Xử lý sự kiện khi có tin nhắn mới trong máy chủ (Kích hoạt Anti-Spam)

const { handleMessage } = require('../utils/antiSpam');
const { handleLogChannelMessage } = require('../utils/logChannelGuard');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // 1. Kiểm tra và bảo vệ kênh log (xóa tin nhắn thường, điều hướng sau 10s tự hủy)
    const handled = await handleLogChannelMessage(message).catch(err => {
      console.error('Lỗi trong bộ xử lý bảo vệ kênh log:', err.message);
      return false;
    });

    if (handled) return;

    // 2. Kích hoạt Anti-Spam cho các kênh thông thường
    await handleMessage(message, client).catch(err => {
      console.error('Lỗi trong bộ xử lý Anti-Spam:', err.message);
    });
  }
};
