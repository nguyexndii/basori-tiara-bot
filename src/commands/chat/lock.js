// src/commands/chat/lock.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Khóa kênh chat (Không cho thành viên bình thường gửi tin nhắn)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      await logModAction(interaction.client, {
        action: 'LOCK CHANNEL (Khóa kênh)',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: 'Quản trị viên khóa kênh chat',
        extra: `Kênh: <#${interaction.channel.id}>`
      });

      return interaction.reply({
        content: `${e('icon_lock')} Đã khóa kênh **#${interaction.channel.name}** thành công! Thành viên bình thường không thể gửi tin nhắn.`
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi khóa kênh: ${err.message}`, ephemeral: true });
    }
  }
};
