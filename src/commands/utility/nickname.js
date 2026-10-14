// src/commands/utility/nickname.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Đổi hoặc đặt lại biệt danh cho thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần đổi').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Biệt danh mới (để trống nếu muốn reset về tên gốc)').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const newNick = interaction.options.getString('name');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${e('icon_error')} Không tìm thấy thành viên này trong máy chủ!`, ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: `${e('icon_error')} Bạn không thể đổi biệt danh của người có chức vụ ngang bằng hoặc cao hơn bạn!`, ephemeral: true });
    }

    if (!member.manageable) {
      return interaction.reply({ content: `${e('icon_error')} Bot không thể đổi biệt danh thành viên này do chức vụ của họ cao hơn Bot!`, ephemeral: true });
    }

    try {
      await member.setNickname(newNick || null);
      await logModAction(interaction.client, {
        action: 'CHANGE NICKNAME',
        target: target,
        moderator: interaction.user,
        reason: newNick ? `Đổi thành "${newNick}"` : 'Reset về tên gốc'
      });

      if (newNick) {
        return interaction.reply({ content: `${e('icon_success')} Đã đổi biệt danh của **${target.tag}** thành **${newNick}**!`, allowedMentions: { parse: ['users'] } });
      }
      return interaction.reply({ content: `${e('icon_success')} Đã đặt lại biệt danh gốc cho **${target.tag}**!`, allowedMentions: { parse: ['users'] } });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi: ${err.message}`, ephemeral: true });
    }
  }
};
