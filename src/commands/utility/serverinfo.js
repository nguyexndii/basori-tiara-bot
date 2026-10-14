// src/commands/utility/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Xem thông tin thống kê về máy chủ'),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const { guild } = interaction;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`${e('icon_owner')} Thông tin máy chủ: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: `${e('icon_owner')} Chủ sở hữu`, value: `${owner.user.tag}`, inline: true },
        { name: `${e('icon_member')} Tổng thành viên`, value: `${guild.memberCount}`, inline: true },
        { name: `${e('icon_channel')} Kênh`, value: `${guild.channels.cache.size}`, inline: true },
        { name: `${e('icon_role')} Số lượng vai trò`, value: `${guild.roles.cache.size}`, inline: true },
        { name: `${e('icon_calendar')} Ngày thành lập`, value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setFooter({ text: `ID Server: ${guild.id}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
