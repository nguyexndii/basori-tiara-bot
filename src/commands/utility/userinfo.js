// src/commands/utility/userinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Xem thông tin của một thành viên')
    .addUserOption(opt => opt.setName('target').setDescription('Người dùng cần xem (để trống nếu xem bản thân)').setRequired(false)),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e('icon_member')} Thông tin: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${e('icon_id')} ID`, value: user.id, inline: true },
        { name: `${e('icon_calendar')} Ngày tạo tài khoản`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: `${e('icon_join')} Ngày vào server`, value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Không rõ', inline: true },
        { name: `${e('icon_role')} Vai trò cao nhất`, value: member ? member.roles.highest.toString() : 'Không rõ', inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
