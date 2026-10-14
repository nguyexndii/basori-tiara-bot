// src/events/messageCreate.js
// Xử lý sự kiện tin nhắn mới: Điều phối Quản gia AI tại kênh Admin & Kích hoạt Anti-Spam tại các kênh khác

const { handleMessage } = require('../utils/antiSpam');
const { validateAdminMessage } = require('../agent/promptGuard');
const { handleAdminPrompt } = require('../agent/agentController');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message || message.author.bot) return;

    // 1. Kiểm tra xem tin nhắn có phải gửi tại kênh Admin Prompt không
    const isAdminPrompt = await validateAdminMessage(message);
    if (isAdminPrompt) {
      // Chuyển sang cho Quản gia AI xử lý
      return await handleAdminPrompt(message).catch(err => {
        console.error('Lỗi khi Quản gia AI xử lý Prompt:', err);
      });
    }

    // 2. Với các kênh thông thường: Chạy qua bộ lọc Anti-Spam
    await handleMessage(message, client).catch(err => {
      console.error('Lỗi trong bộ xử lý Anti-Spam:', err.message);
    });
  }
};
