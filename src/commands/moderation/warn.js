// src/commands/moderation/warn.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');
const { addWarning } = require('../../database/storageAdapter');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Cảnh cáo một thành viên và lưu vào hệ thống')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên bị cảnh cáo').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Lý do cảnh cáo').setRequired(true)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason').slice(0, 500);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: `${e('icon_error')} Bạn không thể cảnh cáo người có chức vụ ngang bằng hoặc cao hơn bạn!`, ephemeral: true });
    }

    try {
      const { total } = await addWarning(interaction.guild.id, target.id, reason, interaction.user.tag);

      await logModAction(interaction.client, {
        action: 'WARN (Cảnh cáo)',
        target: target,
        moderator: interaction.user,
        reason: reason,
        extra: `Tổng số lần cảnh cáo hiện tại: ${total}`
      });

      return interaction.reply({
        content: `${e('icon_warn')} Đã gửi cảnh cáo đến **${target.tag}**!\n📝 Lý do: \`${reason}\`\n📊 Tổng số lần cảnh cáo hiện tại: **${total}**`,
        allowedMentions: { parse: ['users'] }
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi lưu cảnh cáo: ${err.message}`, ephemeral: true });
    }
  }
};
