// src/commands/moderation/warnings.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { getWarnings } = require('../../database/storageAdapter');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Xem lịch sử các lần bị cảnh cáo của một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('target').setDescription('Thành viên cần xem').setRequired(true)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const target = interaction.options.getUser('target');
    const userWarns = await getWarnings(interaction.guild.id, target.id);

    if (userWarns.length === 0) {
      return interaction.reply({ content: `${e('icon_success')} Thành viên **${target.tag}** chưa có tiền án cảnh cáo nào!`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${e('icon_warn')} Lịch sử cảnh cáo: ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(`Tổng số lần vi phạm: **${userWarns.length}**`)
      .addFields(
        userWarns.slice(0, 15).map((w, index) => ({
          name: `#${index + 1} - Ngày ${new Date(w.timestamp).toLocaleDateString('vi-VN')}`,
          value: `Lý do: \`${w.reason}\`\nNgười phạt: **${w.moderator}**`
        }))
      )
      .setFooter({ text: `ID: ${target.id}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
