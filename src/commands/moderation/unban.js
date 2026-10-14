// src/commands/moderation/unban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Hủy cấm (Unban) cho người dùng bằng ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('userid').setDescription('ID người dùng cần hủy cấm').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Lý do hủy cấm').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const userId = interaction.options.getString('userid').trim();
    const reason = (interaction.options.getString('reason') || 'Không có lý do cụ thể').slice(0, 500);

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return interaction.reply({ content: `${e('icon_error')} Không tìm thấy người dùng này trong danh sách bị cấm của máy chủ!`, ephemeral: true });
      }

      await interaction.guild.bans.remove(userId, reason);
      await logModAction(interaction.client, {
        action: 'UNBAN (Hủy cấm)',
        target: banInfo.user,
        moderator: interaction.user,
        reason: reason
      });

      return interaction.reply({
        content: `${e('icon_success')} Đã hủy cấm thành công cho người dùng **${banInfo.user.tag}** (\`${userId}\`)!\n📝 Lý do: \`${reason}\``,
        allowedMentions: { parse: ['users'] }
      });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi hủy cấm: ${err.message}`, ephemeral: true });
    }
  }
};
