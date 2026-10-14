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

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentMessages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(m => m.createdTimestamp <= twoWeeksAgo);

      let deletedCount = 0;
      if (recentMessages.size > 0) {
        const deleted = await interaction.channel.bulkDelete(recentMessages, true);
        deletedCount += deleted.size;
      }

      if (oldMessages.size > 0 && oldMessages.size <= 20) {
        for (const msg of oldMessages.values()) {
          await msg.delete().catch(() => {});
          deletedCount++;
        }
      }

      await logModAction(interaction.client, {
        action: 'CLEAR (Xóa tin nhắn)',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: `Dọn dẹp kênh chat`,
        extra: `Đã xóa ${deletedCount} tin nhắn trong kênh <#${interaction.channel.id}>`
      });

      return interaction.editReply({
        content: `${e('icon_clear')} Đã dọn dẹp thành công **${deletedCount}** tin nhắn!`
      });
    } catch (err) {
      return interaction.editReply({
        content: `${e('icon_error')} Đã xảy ra lỗi khi xóa tin nhắn: ${err.message}`
      });
    }
  }
};
