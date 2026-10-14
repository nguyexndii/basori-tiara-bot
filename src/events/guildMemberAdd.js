// src/events/guildMemberAdd.js
// Xử lý sự kiện khi có thành viên mới tham gia (Kích hoạt Anti-Raid & Chào Mừng)

const { EmbedBuilder } = require('discord.js');
const { handleMemberJoin } = require('../utils/antiRaid');
const { logMemberJoin } = require('../utils/logger');
const { getSettings } = require('../database/storageAdapter');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // 1. Gửi log thành viên mới vào kênh log chỉ định
    await logMemberJoin(client, member).catch(() => {});

    // 2. Kích hoạt thuật toán phát hiện Join Raid đột biến
    await handleMemberJoin(member, client).catch(err => {
      console.error('Lỗi trong bộ xử lý Anti-Raid:', err.message);
    });

    // 2. Tự động gửi thiệp chào mừng nếu server có cấu hình
    try {
      const settings = await getSettings(member.guild.id);
      if (settings?.welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannelId);
        if (welcomeChannel) {
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`🎉 Chào mừng thành viên mới!`)
            .setDescription(`Chào mừng ${member} đã tham gia **${member.guild.name}**!\nChúc bạn có những giây phút vui vẻ tại máy chủ! ✨`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Thành viên thứ #${member.guild.memberCount}` })
            .setTimestamp();

          await welcomeChannel.send({
            content: `Chào mừng ${member} đến với máy chủ!`,
            embeds: [embed],
            allowedMentions: { parse: ['users'] }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn chào mừng:', err.message);
    }
  }
};
