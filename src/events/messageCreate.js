// src/events/messageCreate.js
// Xử lý sự kiện khi có tin nhắn mới trong máy chủ (Kích hoạt Anti-Spam)

const { handleMessage } = require('../utils/antiSpam');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    await handleMessage(message, client).catch(err => {
      console.error('Lỗi trong bộ xử lý Anti-Spam:', err.message);
    });
  }
};
