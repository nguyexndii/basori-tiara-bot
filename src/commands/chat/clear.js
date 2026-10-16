// src/commands/chat/clear.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xóa nhanh số lượng lớn tin nhắn trong kênh hiện tại')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => 
      opt.setName('amount')
        .setDescription('Số lượng tin nhắn cần xóa (1 - 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    const startTime = Date.now();
    const MAX_DURATION_MS = 6000; // Giới hạn tối đa 6 giây để không treo lệnh

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount }).catch(() => null);

      if (!messages || messages.size === 0) {
        return interaction.editReply({
          content: `${e('icon_clear')} Kênh hiện không có tin nhắn nào cần dọn dẹp!`
        });
      }

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentMessages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(m => m.createdTimestamp <= twoWeeksAgo);

      let deletedCount = 0;
      let reachedTimeout = false;

      // 1. Xóa nhanh tin nhắn dưới 14 ngày bằng bulkDelete (cực nhanh)
      if (recentMessages.size > 0) {
        try {
          const deleted = await interaction.channel.bulkDelete(recentMessages, true);
          deletedCount += deleted.size;
        } catch (bulkErr) {
          console.warn('Lỗi bulkDelete tin nhắn gần:', bulkErr.message);
        }
      }

      // 2. Xóa từng tin nhắn cũ hơn 14 ngày (có giới hạn thời gian chặt chẽ)
      if (oldMessages.size > 0) {
        for (const msg of oldMessages.values()) {
          // Nếu đã chạm mốc thời gian an toàn -> dừng ngay lập tức
          if (Date.now() - startTime >= MAX_DURATION_MS - 1500) {
            reachedTimeout = true;
            break;
          }

          try {
            await msg.delete().catch(() => {});
            deletedCount++;
            // Nghỉ ngắn chống rate limit Discord
            await new Promise(r => setTimeout(r, 350));
          } catch {
            // Bỏ qua lỗi xóa đơn lẻ
          }
        }

        if (oldMessages.size > (messages.size - recentMessages.size) || (oldMessages.size > deletedCount - recentMessages.size)) {
          reachedTimeout = true;
        }
      }

      // Ghi log quản trị nếu có xóa được tin nhắn
      if (deletedCount > 0) {
        await logModAction(interaction.client, {
          action: 'CLEAR (Xóa tin nhắn)',
          target: `#${interaction.channel.name}`,
          moderator: interaction.user,
          reason: `Dọn dẹp kênh chat`,
          extra: `Đã xóa ${deletedCount}/${amount} tin nhắn trong kênh <#${interaction.channel.id}>`
        }).catch(() => {});
      }

      let replyText = `${e('icon_clear')} Đã dọn dẹp thành công **${deletedCount}** tin nhắn!`;
      if (reachedTimeout && deletedCount < amount) {
        replyText += `\n*(Đã dừng an toàn do các tin nhắn còn lại cũ hơn 14 ngày - Discord hạn chế tốc độ xóa)*`;
      }

      return interaction.editReply({ content: replyText });
    } catch (err) {
      console.error('Lỗi khi thực thi lệnh /clear:', err);
      return interaction.editReply({
        content: `${e('icon_error')} Đã xảy ra lỗi khi xóa tin nhắn: ${err.message}`
      }).catch(() => {});
    }
  }
};
