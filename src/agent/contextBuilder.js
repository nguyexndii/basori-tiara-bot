// src/agent/contextBuilder.js
// Quét và tóm tắt cấu trúc Server (Categories, Channels, Roles) thành ngữ cảnh gọn cho Gemini

const { ChannelType } = require('discord.js');

/**
 * Quét toàn bộ thông tin server thành định dạng JSON cô đọng cho AI
 * @param {import('discord.js').Guild} guild 
 * @returns {Promise<object>}
 */
async function buildServerContext(guild) {
  if (!guild) return {};

  try {
    // 1. Nạp đầy đủ cache channels và roles
    await guild.channels.fetch().catch(() => {});
    await guild.roles.fetch().catch(() => {});

    // 2. Phân loại danh mục
    const categories = [];
    const textChannels = [];
    const voiceChannels = [];
    const otherChannels = [];

    guild.channels.cache.forEach(ch => {
      if (!ch) return;
      if (ch.type === ChannelType.GuildCategory) {
        categories.push({
          id: ch.id,
          name: ch.name,
          position: ch.position
        });
      } else if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
        textChannels.push({
          id: ch.id,
          name: ch.name,
          parentId: ch.parentId || null,
          categoryName: ch.parent ? ch.parent.name : null,
          topic: ch.topic || null
        });
      } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
        voiceChannels.push({
          id: ch.id,
          name: ch.name,
          parentId: ch.parentId || null,
          categoryName: ch.parent ? ch.parent.name : null
        });
      } else {
        otherChannels.push({
          id: ch.id,
          name: ch.name,
          type: ChannelType[ch.type] || ch.type,
          parentId: ch.parentId || null
        });
      }
    });

    // 3. Phân loại Roles (Loại bỏ @everyone khỏi danh sách nếu cần hoặc giữ để tham khảo)
    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        isEveryone: r.id === guild.id,
        managed: r.managed
      }))
      .slice(0, 50); // Giới hạn 50 role cao nhất để tiết kiệm token

    return {
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId
      },
      categories,
      channels: {
        text: textChannels,
        voice: voiceChannels,
        others: otherChannels
      },
      roles
    };
  } catch (err) {
    console.error('Lỗi khi xây dựng Server Context:', err.message);
    return {
      guild: { id: guild.id, name: guild.name },
      categories: [],
      channels: { text: [], voice: [], others: [] },
      roles: []
    };
  }
}

module.exports = {
  buildServerContext
};
