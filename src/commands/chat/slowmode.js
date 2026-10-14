// src/commands/chat/slowmode.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Cài đặt thời gian chờ giữa các tin nhắn (Chế độ chậm)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt => 
      opt.setName('seconds')
        .setDescription('Số giây chờ (0 để tắt chế độ chậm)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      await logModAction(interaction.client, {
        action: 'SLOWMODE',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: seconds === 0 ? 'Tắt chế độ chậm' : `Bật chế độ chậm ${seconds}s`,
        extra: `Kênh: <#${interaction.channel.id}>`
      });

      if (seconds === 0) {
        return interaction.reply({ content: `${e('icon_success')} Đã tắt chế độ chậm cho kênh **#${interaction.channel.name}**!` });
      }
      return interaction.reply({ content: `${e('icon_slowmode')} Đã kích hoạt chế độ chậm **${seconds} giây** cho kênh **#${interaction.channel.name}**!` });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi: ${err.message}`, ephemeral: true });
    }
  }
};
