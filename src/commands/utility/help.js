// src/commands/utility/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem toàn bộ danh sách 22 câu lệnh quản trị và hướng dẫn sử dụng'),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`👑 Danh Sách Lệnh Quản Trị - Basori Tiara`)
      .setDescription('Bot quản trị máy chủ phong cách Pixel Art & Kaomoji. Dưới đây là danh sách toàn bộ các câu lệnh Slash `/`:')
      .addFields(
        {
          name: `${e('icon_ban')} 1. Kỷ Luật & Trừng Phạt (Moderation)`,
          value: '• `/ban`: Cấm vĩnh viễn thành viên khỏi máy chủ\n• `/unban`: Hủy cấm cho người dùng qua ID\n• `/kick`: Đuổi thành viên khỏi máy chủ\n• `/timeout`: Cách ly thành viên (1p - 7 ngày)\n• `/untimeout`: Gỡ cách ly trước thời hạn\n• `/warn`: Cảnh cáo thành viên và lưu vào hệ thống\n• `/warnings`: Xem lịch sử vi phạm của thành viên\n• `/clearwarns`: Xóa sạch lịch sử cảnh cáo',
          inline: false
        },
        {
          name: `${e('icon_channel')} 2. Quản Trị Kênh & Chat (Chat Management)`,
          value: '• `/clear`: Xóa nhanh 1-100 tin nhắn (kèm cơ chế dọn tin cũ)\n• `/slowmode`: Bật/tắt chế độ nhắn chậm (0s - 6h)\n• `/lock`: Khóa kênh chat không cho thành viên nhắn\n• `/unlock`: Mở khóa lại kênh chat\n• `/channel`: Tạo, xóa hoặc đổi tên kênh',
          inline: false
        },
        {
          name: `${e('icon_role')} 3. Tiện Ích & Thông Tin (Utilities)`,
          value: '• `/role`: Gán hoặc thu hồi vai trò của thành viên\n• `/nickname`: Đổi hoặc đặt lại biệt danh\n• `/serverinfo`: Xem thống kê chi tiết về máy chủ\n• `/userinfo`: Xem hồ sơ, ID và ngày tham gia\n• `/ping`: Kiểm tra độ trễ phản hồi và WebSocket API\n• `/help`: Xem hướng dẫn sử dụng này',
          inline: false
        },
        {
          name: `${e('icon_poll')} 4. Cộng Đồng & Tương Tác (Community)`,
          value: '• `/poll`: Tạo cuộc bình chọn Native Poll Widget chính chủ Discord\n• `/announce`: Gửi thông báo Embed trang trọng nhiều màu sắc\n• `/setwelcome`: Cài đặt hoặc tắt kênh tự động gửi thiệp chào mừng',
          inline: false
        }
      )
      .setFooter({ text: 'Basori Tiara • Bảo mật & Chống Spam/Raid' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
