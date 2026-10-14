// src/commands/moderation/clearwarns.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');
const { clearWarnings } = require('../../database/storageAdapter');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Xóa toàn bộ lịch sử cảnh cáo của một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần xóa cảnh cáo').setRequired(true)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');

    const count = await clearWarnings(interaction.guild.id, target.id);
    if (count === 0) {
      return interaction.reply({ content: `${e('icon_warn')} Thành viên **${target.tag}** vốn không có cảnh cáo nào để xóa!`, ephemeral: true });
    }

    await logModAction(interaction.client, {
      action: 'CLEARWARNS (Xóa cảnh cáo)',
      target: target,
      moderator: interaction.user,
      reason: 'Quản trị viên xóa toàn bộ tiền án',
      extra: `Đã xóa ${count} cảnh cáo`
    });

    return interaction.reply({
      content: `${e('icon_success')} Đã xóa sạch **${count}** lần cảnh cáo của **${target.tag}**!`,
      allowedMentions: { parse: ['users'] }
    });
  }
};
