// src/events/messageDelete.js
// Xử lý sự kiện khi có tin nhắn bị xóa trong máy chủ

const { logMessageDelete } = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    await logMessageDelete(client, message).catch(err => {
      console.error('Lỗi khi ghi log tin nhắn xóa:', err.message);
    });
  }
};
