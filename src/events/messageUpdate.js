// src/events/messageUpdate.js
// Xử lý sự kiện khi có tin nhắn bị chỉnh sửa trong máy chủ

const { logMessageUpdate } = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    await logMessageUpdate(client, oldMessage, newMessage).catch(err => {
      console.error('Lỗi khi ghi log tin nhắn sửa:', err.message);
    });
  }
};
