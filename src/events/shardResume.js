// src/events/shardResume.js
// Bắt sự kiện khi Bot tự động kết nối lại thành công sau khi bị ngắt kết nối (Reconnect/Resume)

const { logBotReconnected } = require('../utils/logger');

module.exports = {
  name: 'shardResume',
  async execute(shardId, replayedEvents, client) {
    await logBotReconnected(client, shardId).catch(err => {
      console.error('Lỗi khi gửi log Reconnected:', err.message);
    });
  }
};
