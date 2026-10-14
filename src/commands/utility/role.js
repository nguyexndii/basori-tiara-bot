// src/commands/utility/role.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Gán hoặc thu hồi vai trò của một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần chỉnh vai trò').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Vai trò cần gán hoặc gỡ').setRequired(true)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${e('icon_error')} Không tìm thấy thành viên này trong máy chủ!`, ephemeral: true });
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: `${e('icon_error')} Bạn không thể gán/gỡ vai trò có vị trí ngang bằng hoặc cao hơn vai trò cao nhất của bạn!`, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: `${e('icon_error')} Bot không thể quản lý vai trò này vì nó cao hơn vai trò của Bot!`, ephemeral: true });
    }

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await logModAction(interaction.client, {
          action: 'REMOVE ROLE',
          target: target,
          moderator: interaction.user,
          reason: `Gỡ vai trò ${role.name}`
        });

        return interaction.reply({
          content: `${e('icon_role')} Đã gỡ vai trò **@${role.name}** khỏi **${target.tag}**!`,
          allowedMentions: { parse: ['users'] }
        });
      } else {
        await member.roles.add(role);
        await logModAction(interaction.client, {
          action: 'ADD ROLE',
          target: target,
          moderator: interaction.user,
          reason: `Gán vai trò ${role.name}`
        });

        return interaction.reply({
          content: `${e('icon_role')} Đã gán vai trò **@${role.name}** cho **${target.tag}** thành công!`,
          allowedMentions: { parse: ['users'] }
        });
      }
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi chỉnh vai trò: ${err.message}`, ephemeral: true });
    }
  }
};
