// src/commands/moderation/untimeout.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Hủy cách ly (Gỡ Timeout) cho một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần gỡ cách ly').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Lý do gỡ cách ly').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const reason = (interaction.options.getString('reason') || 'Không có lý do cụ thể').slice(0, 500);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${e('icon_error')} Không tìm thấy thành viên này trong máy chủ!`, ephemeral: true });
    }

    if (!member.communicationDisabledUntilTimestamp) {
      return interaction.reply({ content: `${e('icon_warn')} Thành viên này hiện không bị cách ly!`, ephemeral: true });
    }

    try {
      await member.timeout(null, reason);
      await logModAction(interaction.client, {
        action: 'UNTIMEOUT (Hủy cách ly)',
        target: target,
        moderator: interaction.user,
        reason: reason
      });

      return interaction.reply({
        content: `${e('icon_success')} Đã gỡ cách ly thành công cho **${target.tag}**!\n📝 Lý do: \`${reason}\``,
        allowedMentions: { parse: ['users'] }
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi gỡ cách ly: ${err.message}`, ephemeral: true });
    }
  }
};
