// src/agent/tools/messageTools.js
// Nghiệp vụ Tin nhắn, Dọn dẹp thông minh, Thông báo Embed, Poll & Tóm tắt hội thoại

const { EmbedBuilder } = require('discord.js');
const { assertNotProtected } = require('../../config/ids');
const { sanitizeUntrustedChat } = require('../promptGuard');

// 1. Dọn dẹp tin nhắn thông minh (Smart Purge)
async function smartPurgeMessages(guild, args) {
  const { channelId, amount = 10, userId, botsOnly = false, hasAttachments = false, containsWord } = args;
  assertNotProtected(channelId, 'kênh xóa tin nhắn');

  const channel = await guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh văn bản: ${channelId}`);

  const fetchLimit = Math.min(Math.max(Number(amount) * 2, 20), 100);
  const messages = await channel.messages.fetch({ limit: fetchLimit });

  const toDelete = messages.filter(msg => {
    // Không xóa tin nhắn cũ hơn 14 ngày (giới hạn Discord API)
    if (Date.now() - msg.createdTimestamp > 14 * 24 * 60 * 60 * 1000) return false;
    if (userId && msg.author.id !== userId) return false;
    if (botsOnly && !msg.author.bot) return false;
    if (hasAttachments && msg.attachments.size === 0) return false;
    if (containsWord && !msg.content.toLowerCase().includes(containsWord.toLowerCase())) return false;
    return true;
  });

  const targetMessages = Array.from(toDelete.values()).slice(0, Math.min(Number(amount), 100));
  const deleted = await channel.bulkDelete(targetMessages, true);

  return {
    success: true,
    action: 'SMART_PURGE_MESSAGES',
    channelId,
    deletedCount: deleted.size,
    filter: { userId, botsOnly, hasAttachments, containsWord }
  };
}

// 2. Gửi hoặc Chỉnh sửa Thông báo Embed
async function sendOrEditEmbedAnnouncement(guild, args) {
  const { channelId, messageId, title, description, color = '#5865F2', fields = [], footer, image, thumbnail, pingRole } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title || '📢 THÔNG BÁO TỪ BAN QUẢN TRỊ')
    .setDescription(description || '')
    .setTimestamp();

  if (Array.isArray(fields) && fields.length > 0) {
    embed.addFields(fields);
  }
  if (footer) embed.setFooter({ text: footer });
  if (image) embed.setImage(image);
  if (thumbnail) embed.setThumbnail(thumbnail);

  const payload = { embeds: [embed] };
  if (pingRole) {
    payload.content = `<@&${pingRole}>`;
  }

  // Nếu sửa tin nhắn cũ
  if (messageId) {
    const targetMsg = await channel.messages.fetch(messageId);
    if (!targetMsg) throw new Error(`Không tìm thấy tin nhắn cũ để sửa: ${messageId}`);
    const edited = await targetMsg.edit(payload);
    return { success: true, action: 'EDIT_EMBED', messageId: edited.id, channelId };
  }

  // Gửi mới
  const sent = await channel.send(payload);
  return { success: true, action: 'SEND_EMBED', messageId: sent.id, channelId };
}

// 3. Tạo bảng Bình chọn (Poll)
async function createPoll(guild, args) {
  const { channelId, question, answers = [], durationHours = 24, allowMultiselect = false } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  if (answers.length < 2) throw new Error('Bình chọn cần ít nhất 2 câu trả lời');

  const pollPayload = {
    poll: {
      question: { text: question },
      answers: answers.slice(0, 10).map(a => ({ text: a })),
      duration: Math.min(Math.max(Number(durationHours), 1), 168), // 1h đến 7 ngày
      allowMultiselect: Boolean(allowMultiselect)
    }
  };

  const sent = await channel.send(pollPayload);
  return { success: true, action: 'CREATE_POLL', messageId: sent.id, channelId, question };
}

// 4. Ghim, bỏ ghim và Reaction
async function managePinsAndReactions(guild, args) {
  const { channelId, messageId, action, emoji } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  const message = await channel.messages.fetch(messageId);
  if (!message) throw new Error(`Không tìm thấy tin nhắn: ${messageId}`);

  if (action === 'pin') {
    await message.pin();
    return { success: true, action: 'PIN_MESSAGE', messageId };
  }
  if (action === 'unpin') {
    await message.unpin();
    return { success: true, action: 'UNPIN_MESSAGE', messageId };
  }
  if (action === 'react' && emoji) {
    await message.react(emoji);
    return { success: true, action: 'REACT_MESSAGE', messageId, emoji };
  }
  if (action === 'clearReactions') {
    await message.reactions.removeAll();
    return { success: true, action: 'CLEAR_REACTIONS', messageId };
  }

  throw new Error(`Thao tác Pin/Reaction không hợp lệ: ${action}`);
}

// 5. Đọc tin nhắn để tóm tắt hội thoại (Read-Only & Chống Prompt Injection)
async function summarizeChannelConversation(guild, args) {
  const { channelId, limit = 25 } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  const messages = await channel.messages.fetch({ limit: Math.min(Number(limit), 50) });
  const sorted = Array.from(messages.values()).reverse();

  const formattedLogs = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleTimeString('vi-VN');
    return `[${time}] ${m.author.username}: ${m.content}`;
  }).join('\n');

  // Bọc vào thẻ an toàn chống indirect prompt injection
  const securedText = sanitizeUntrustedChat(formattedLogs);

  return {
    success: true,
    action: 'SUMMARIZE_CONVERSATION',
    channelId,
    channelName: channel.name,
    messageCount: sorted.length,
    conversationData: securedText
  };
}

module.exports = {
  smartPurgeMessages,
  sendOrEditEmbedAnnouncement,
  createPoll,
  managePinsAndReactions,
  summarizeChannelConversation
};
