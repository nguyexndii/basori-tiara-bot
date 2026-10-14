// src/agent/promptGuard.js
// Chốt chặn bảo mật 4 lớp: Xác thực Admin tối cao & Chống Prompt Injection

const { PermissionsBitField } = require('discord.js');
const { ADMIN_PROMPT_CHANNEL_ID, OWNER_ADMIN_IDS } = require('../config/ids');
const { logSystemError } = require('../utils/logger');

/**
 * Kiểm tra xem tin nhắn có đủ điều kiện để kích hoạt Quản gia AI hay không
 * @param {import('discord.js').Message} message 
 * @returns {boolean}
 */
async function validateAdminMessage(message) {
  // Lớp 1: Bỏ qua Bot, Webhook và tin nhắn hệ thống
  if (!message || message.author.bot || message.webhookId || message.system) {
    return false;
  }

  // Lớp 2: Chỉ lắng nghe đúng Kênh Admin Prompt đã cấu hình
  if (message.channelId !== ADMIN_PROMPT_CHANNEL_ID) {
    return false;
  }

  // Lớp 3: Kiểm tra User ID và Quyền Administrator
  const isOwner = OWNER_ADMIN_IDS.includes(message.author.id);
  const isAdmin = message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isOwner || !isAdmin) {
    console.warn(`🚨 [CẢNH BÁO XÂM NHẬP] Tài khoản ${message.author.tag} (${message.author.id}) nhắn vào kênh Admin Prompt!`);
    
    // Tự động xóa tin nhắn của người ngoài để giữ sạch kênh bảo mật
    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    // Gửi cảnh báo tạm thời
    const warningMsg = await message.channel.send({
      content: `🚫 **TRUY CẬP BỊ TỪ CHỐI:** Kênh này chỉ dành riêng cho Chủ Sở Hữu (\`Owner\`). Mọi hành vi trái phép đều được ghi nhận vào hệ thống audit!`
    }).catch(() => null);

    if (warningMsg) {
      setTimeout(() => warningMsg.delete().catch(() => {}), 7000);
    }

    await logSystemError(message.client, 'Cảnh Báo Xâm Nhập Kênh Admin', {
      user: `${message.author.tag} (${message.author.id})`,
      content: message.content,
      channel: message.channel.name
    });

    return false;
  }

  return true;
}

/**
 * Bọc nội dung tin nhắn của người ngoài vào thẻ untrusted để chống Indirect Prompt Injection
 * @param {string} text 
 * @returns {string}
 */
function sanitizeUntrustedChat(text) {
  if (!text) return '';
  // Thoát các thẻ nhạy cảm nếu có
  const clean = String(text).replace(/<\/?untrusted_chat_data>/gi, '');
  return `<untrusted_chat_data>\n${clean}\n</untrusted_chat_data>`;
}

module.exports = {
  validateAdminMessage,
  sanitizeUntrustedChat
};
