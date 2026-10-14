// src/events/messageCreate.js
// Xử lý sự kiện tin nhắn mới: Điều phối Quản gia AI tại kênh Admin & Kích hoạt Anti-Spam tại các kênh khác

const { EmbedBuilder } = require('discord.js');
const { handleMessage } = require('../utils/antiSpam');
const { validateAdminMessage } = require('../agent/promptGuard');
const { handleAdminPrompt } = require('../agent/agentController');
const { OWNER_ADMIN_IDS } = require('../config/ids');

// Cờ khóa khẩn cấp Kill Switch toàn cục cho Quản gia AI
let isButlerLocked = false;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message || message.author.bot) return;

    const content = message.content ? message.content.trim() : '';

    // ==================== LỆNH CỨNG KHẨN CẤP (KHÔNG GỌI AI) ====================
    if (content === '!butler-panic') {
      if (!OWNER_ADMIN_IDS.includes(message.author.id)) return;

      isButlerLocked = true;
      const panicEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚨 KHÓA KHẨN CẤP QUẢN GIA AI (KILL SWITCH)')
        .setDescription(
          '**Hệ thống Quản gia AI đã bị KHÓA KHẨN CẤP ngay lập tức!**\n\n' +
          '• Mọi yêu cầu tự động và lệnh AI đã bị tạm đình chỉ hoàn toàn.\n' +
          '• Bot sẽ từ chối mọi câu lệnh tại kênh Admin cho đến khi được mở khóa lại.\n\n' +
          '👉 **Để mở khóa hoạt động trở lại:** Sếp vui lòng gõ lệnh `!butler-unlock`'
        )
        .setFooter({ text: `Kích hoạt bởi Admin: ${message.author.tag}` })
        .setTimestamp();

      return await message.reply({ embeds: [panicEmbed] });
    }

    if (content === '!butler-unlock') {
      if (!OWNER_ADMIN_IDS.includes(message.author.id)) return;

      isButlerLocked = false;
      const unlockEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🔓 ĐÃ MỞ KHÓA HOẠT ĐỘNG QUẢN GIA AI')
        .setDescription(
          '**Hệ thống Quản gia AI đã được MỞ KHÓA an toàn!**\n\n' +
          'Quản gia AI đã sẵn sàng tiếp nhận và hỗ trợ Sếp quản lý máy chủ qua ngôn ngữ tự nhiên.'
        )
        .setFooter({ text: `Mở khóa bởi Admin: ${message.author.tag}` })
        .setTimestamp();

      return await message.reply({ embeds: [unlockEmbed] });
    }

    // ==================== KÊNH ADMIN PROMPT ====================
    const isAdminPrompt = await validateAdminMessage(message);
    if (isAdminPrompt) {
      // Nếu đang trong trạng thái khóa khẩn cấp -> Từ chối tiếp nhận
      if (isButlerLocked) {
        return await message.reply({
          content: '🔒 **Hệ thống Quản gia hiện đang bị KHÓA KHẨN CẤP** bằng lệnh `!butler-panic`.\nSếp hãy gõ lệnh `!butler-unlock` để kích hoạt lại hệ thống trước khi ra lệnh mới!'
        });
      }

      // Chuyển sang cho Quản gia AI xử lý
      return await handleAdminPrompt(message).catch(err => {
        console.error('Lỗi khi Quản gia AI xử lý Prompt:', err);
      });
    }

    // ==================== CÁC KÊNH THÔNG THƯỜNG (ANTI-SPAM) ====================
    await handleMessage(message, client).catch(err => {
      console.error('Lỗi trong bộ xử lý Anti-Spam:', err.message);
    });
  }
};
