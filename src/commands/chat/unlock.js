// src/commands/chat/unlock.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Mở khóa kênh chat (Cho phép thành viên gửi tin nhắn trở lại)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      await logModAction(interaction.client, {
        action: 'UNLOCK CHANNEL (Mở khóa kênh)',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: 'Quản trị viên mở khóa kênh chat',
        extra: `Kênh: <#${interaction.channel.id}>`
      });

      return interaction.reply({
        content: `${e('icon_unlock')} Đã mở khóa kênh **#${interaction.channel.name}**! Mọi người có thể trò chuyện bình thường.`
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi mở khóa kênh: ${err.message}`, ephemeral: true });
    }
  }
};
