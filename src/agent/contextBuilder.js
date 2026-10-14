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

    // 3. Phân loại Roles
    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        isEveryone: r.id === guild.id,
        isAdmin: r.permissions.has(1n << 3n), // 0x8 Administrator
        managed: r.managed
      }))
      .slice(0, 50); // Giới hạn 50 role cao nhất để tiết kiệm token

    // 4. Tạo chuỗi Compact Line Format tiết kiệm 60-70% Token
    const compactLines = [
      `[SERVER]: ${guild.name} (ID: ${guild.id}, Members: ${guild.memberCount}, OwnerId: ${guild.ownerId}, EveryoneRoleId: ${guild.id})`,
      '',
      `[CATEGORIES (${categories.length})]:`,
      ...categories.map(c => `• ${c.name} [ID: ${c.id}, pos: ${c.position}]`),
      '',
      `[TEXT & ANNOUNCEMENT CHANNELS (${textChannels.length})]:`,
      ...textChannels.map(c => `• #${c.name} [ID: ${c.id}, Cat: ${c.categoryName || 'None'}${c.topic ? `, Topic: "${c.topic.slice(0, 50)}"` : ''}]`),
      '',
      `[VOICE & STAGE CHANNELS (${voiceChannels.length})]:`,
      ...voiceChannels.map(c => `• 🔊 ${c.name} [ID: ${c.id}, Cat: ${c.categoryName || 'None'}]`),
      '',
      `[ROLES (${roles.length})]:`,
      ...roles.map(r => `• @${r.name} [ID: ${r.id}, pos: ${r.position}${r.isAdmin ? ', Admin: YES' : ''}${r.isEveryone ? ', EveryoneRole: YES' : ''}]`)
    ];

    const compactText = compactLines.join('\n');

    return {
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        everyoneRoleId: guild.id
      },
      categories,
      channels: {
        text: textChannels,
        voice: voiceChannels,
        others: otherChannels
      },
      roles,
      compactText
    };
  } catch (err) {
    console.error('Lỗi khi xây dựng Server Context:', err.message);
    return {
      guild: { id: guild.id, name: guild.name, everyoneRoleId: guild.id },
      categories: [],
      channels: { text: [], voice: [], others: [] },
      roles: [],
      compactText: `[SERVER]: ${guild.name} (ID: ${guild.id})`
    };
  }
}

module.exports = {
  buildServerContext
};
