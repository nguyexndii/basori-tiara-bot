// src/commands/moderation/timeout.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Cách ly (Timeout) một thành viên trong khoảng thời gian xác định')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần cách ly').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('duration')
        .setDescription('Thời gian cách ly')
        .setRequired(true)
        .addChoices(
          { name: '1 phút', value: 60 * 1000 },
          { name: '5 phút', value: 5 * 60 * 1000 },
          { name: '10 phút', value: 10 * 60 * 1000 },
          { name: '1 giờ', value: 60 * 60 * 1000 },
          { name: '1 ngày (24 giờ)', value: 24 * 60 * 60 * 1000 },
          { name: '1 tuần (7 ngày)', value: 7 * 24 * 60 * 60 * 1000 }
        ))
    .addStringOption(opt => opt.setName('reason').setDescription('Lý do cách ly').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const duration = interaction.options.getInteger('duration');
    const reason = (interaction.options.getString('reason') || 'Không có lý do cụ thể').slice(0, 500);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${e('icon_error')} Không tìm thấy thành viên này trong máy chủ!`, ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: `${e('icon_error')} Bạn không thể cách ly người có chức vụ ngang bằng hoặc cao hơn bạn!`, ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: `${e('icon_error')} Bot không thể cách ly thành viên này do thiếu quyền hoặc chức vụ của họ cao hơn Bot!`, ephemeral: true });
    }

    try {
      await member.timeout(duration, reason);
      const minutes = duration / 60000;
      const durationStr = minutes < 60 ? `${minutes} phút` : minutes < 1440 ? `${minutes / 60} giờ` : `${minutes / 1440} ngày`;

      await logModAction(interaction.client, {
        action: 'TIMEOUT (Cách ly)',
        target: target,
        moderator: interaction.user,
        reason: reason,
        extra: `Thời gian: ${durationStr}`
      });

      return interaction.reply({
        content: `${e('icon_timeout')} Đã cách ly thành viên **${target.tag}** trong **${durationStr}**!\n📝 Lý do: \`${reason}\``,
        allowedMentions: { parse: ['users'] }
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi cách ly: ${err.message}`, ephemeral: true });
    }
  }
};
