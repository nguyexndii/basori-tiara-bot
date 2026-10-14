// src/commands/utility/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ (latency) và tốc độ phản hồi của bot'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Đang kiểm tra ping...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(latency < 200 ? 0x57F287 : latency < 400 ? 0xFEE75C : 0xED4245)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Độ trễ phản hồi (Roundtrip)', value: `\`${latency}ms\``, inline: true },
        { name: '💓 Độ trễ WebSocket (API)', value: `\`${apiPing}ms\``, inline: true }
      )
      .setFooter({ text: 'Basori Tiara' })
      .setTimestamp();

    return interaction.editReply({ content: null, embeds: [embed] });
  }
};
