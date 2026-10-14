// src/commands/community/setwelcome.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');
const { updateSettings } = require('../../database/storageAdapter');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Cài đặt hoặc tắt kênh tự động gửi tin nhắn chào đón thành viên mới')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt => opt.setName('channel').setDescription('Kênh chào mừng (để trống nếu muốn TẮT)').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    if (channel) {
      await updateSettings(guildId, { welcomeChannelId: channel.id });
      await logModAction(interaction.client, {
        action: 'SET WELCOME CHANNEL',
        target: `#${channel.name}`,
        moderator: interaction.user,
        reason: 'Cài đặt kênh chào mừng thành viên mới',
        extra: `Kênh: <#${channel.id}>`
      });

      return interaction.reply({ content: `${e('icon_success')} Đã đặt kênh chào mừng thành viên mới là: **#${channel.name}**!` });
    } else {
      await updateSettings(guildId, { welcomeChannelId: null });
      await logModAction(interaction.client, {
        action: 'DISABLE WELCOME CHANNEL',
        target: 'Không có',
        moderator: interaction.user,
        reason: 'Tắt tính năng chào mừng tự động'
      });

      return interaction.reply({ content: `${e('icon_warn')} Đã tắt tính năng tự động chào mừng thành viên mới.` });
    }
  }
};
