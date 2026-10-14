// src/commands/community/announce.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Gửi thông báo trang trọng dạng thẻ Embed vào một kênh')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(opt => opt.setName('channel').setDescription('Kênh cần gửi thông báo').setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Tiêu đề thông báo').setRequired(true))
    .addStringOption(opt => opt.setName('content').setDescription('Nội dung thông báo (dùng \\n để xuống dòng)').setRequired(true))
    .addStringOption(opt => 
      opt.setName('color')
        .setDescription('Màu sắc thông báo')
        .setRequired(false)
        .addChoices(
          { name: 'Xanh dương (Mặc định)', value: 'blue' },
          { name: 'Đỏ (Khẩn cấp/Cảnh báo)', value: 'red' },
          { name: 'Xanh lá (Tin vui/Sự kiện)', value: 'green' },
          { name: 'Vàng (Lưu ý)', value: 'yellow' }
        )),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title').slice(0, 256);
    const content = interaction.options.getString('content').slice(0, 4000);
    const colorChoice = interaction.options.getString('color') || 'blue';

    const colorMap = {
      blue: 0x5865F2,
      red: 0xED4245,
      green: 0x57F287,
      yellow: 0xFEE75C
    };

    const embed = new EmbedBuilder()
      .setColor(colorMap[colorChoice])
      .setTitle(`${e('icon_announce')} ${title}`)
      .setDescription(content.replace(/\\n/g, '\n'))
      .setFooter({ text: `Thông báo từ: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    try {
      // parse: [] ngăn chặn tuyệt đối việc mượn tay bot ping @everyone / @here
      await channel.send({ 
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

      await logModAction(interaction.client, {
        action: 'ANNOUNCE (Thông báo)',
        target: `#${channel.name}`,
        moderator: interaction.user,
        reason: `Gửi thông báo: "${title}"`,
        extra: `Kênh gửi: <#${channel.id}>`
      });

      return interaction.reply({ content: `${e('icon_success')} Đã gửi thông báo thành công đến kênh **#${channel.name}**!`, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `${e('icon_error')} Đã xảy ra lỗi khi gửi thông báo: ${err.message}`, ephemeral: true });
    }
  }
};
