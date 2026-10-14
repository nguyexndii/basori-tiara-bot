// src/events/ready.js
// Xử lý sự kiện Ready khi Bot khởi động trực tuyến

const { REST, Routes, ActivityType } = require('discord.js');
const { TOKEN, CLIENT_ID } = require('../config/env');
const kaomojis = require('../config/kaomojis');
const { logBotReady, logSystemError } = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`========================================`);
    console.log(`🤖 Bot đã đăng nhập thành công: ${client.user.tag}`);
    console.log(`🌐 Đang phục vụ ${client.guilds.cache.size} máy chủ.`);

    // 1. Khởi động tính năng xoay tua Kaomoji ngẫu nhiên mỗi 60 giây
    const updateKaomoji = () => {
      try {
        const emoji = kaomojis[Math.floor(Math.random() * kaomojis.length)];
        client.user.setPresence({
          activities: [{
            name: emoji,
            type: ActivityType.Custom,
            state: emoji
          }]
        });
      } catch (err) {
        console.error('Lỗi setPresence Kaomoji:', err.message);
      }
    };
    updateKaomoji();
    setInterval(updateKaomoji, 60 * 1000);

    // 2. Tự động đồng bộ các câu lệnh Slash (/) với Discord
    try {
      console.log('🔄 Đang đồng bộ các câu lệnh Slash (/) với Discord...');
      const rest = new REST({ version: '10' }).setToken(TOKEN);
      const commandData = client.commands.map(cmd => cmd.data.toJSON());

      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commandData }
      );

      // Dọn dẹp các lệnh cấp guild nếu có để chống hiển thị trùng lặp
      for (const [guildId, guild] of client.guilds.cache) {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, guildId),
          { body: [] }
        ).catch(() => {});
      }

      console.log(`✅ Đã đồng bộ thành công ${client.commands.size} lệnh Slash chuẩn!`);
    } catch (err) {
      console.error('❌ Lỗi đồng bộ lệnh Slash:', err.message);
      await logSystemError(client, 'Lỗi Đồng Bộ Lệnh Slash', err);
    }

    // 3. Tải Application Emojis từ Developer Portal
    try {
      await client.application.emojis.fetch();
      console.log(`✨ Đã nạp ${client.application.emojis.cache.size} Application Emojis từ Developer Portal!`);
    } catch (emojiErr) {
      // ignore
    }

    // 4. Gửi log Bot Trực Tuyến về kênh log chỉ định
    await logBotReady(client);
    console.log(`========================================`);
  }
};
