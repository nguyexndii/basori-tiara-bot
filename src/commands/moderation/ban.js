// src/commands/moderation/ban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Cấm (Ban) một thành viên khỏi máy chủ')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần cấm').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Lý do cấm').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const reason = (interaction.options.getString('reason') || 'Không có lý do cụ thể').slice(0, 500);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: `${e('icon_error')} Bạn không thể cấm người có chức vụ ngang bằng hoặc cao hơn bạn!`, ephemeral: true });
      }
      if (!member.bannable) {
        return interaction.reply({ content: `${e('icon_error')} Bot không thể cấm thành viên này do thiếu quyền hoặc chức vụ của họ cao hơn Bot!`, ephemeral: true });
      }
    }

    try {
      await interaction.guild.bans.create(target.id, { reason });
      await logModAction(interaction.client, {
        action: 'BAN (Cấm)',
        target: target,
        moderator: interaction.user,
        reason: reason
      });

      return interaction.reply({
        content: `${e('icon_ban')} Đã cấm thành viên **${target.tag}** khỏi máy chủ!\n📝 Lý do: \`${reason}\``,
        allowedMentions: { parse: ['users'] }
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi cấm thành viên: ${err.message}`, ephemeral: true });
    }
  }
};
