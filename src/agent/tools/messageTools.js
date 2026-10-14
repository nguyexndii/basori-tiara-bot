// src/agent/tools/messageTools.js
// Nghiệp vụ Tin nhắn, Dọn dẹp thông minh (Có Backup Transcript), Thông báo Embed, Poll & Tóm tắt hội thoại

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { assertNotProtected, LOG_CHANNEL_ID } = require('../../config/ids');
const { sanitizeUntrustedChat } = require('../promptGuard');

// 1. Dọn dẹp tin nhắn thông minh (Tự động Backup Transcript vào Kênh Log trước khi xóa)
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

  if (targetMessages.length === 0) {
    return {
      success: true,
      action: 'SMART_PURGE_MESSAGES',
      channelId,
      deletedCount: 0,
      message: 'Không tìm thấy tin nhắn nào thỏa mãn bộ lọc để xóa.'
    };
  }

  // --- BẮT BUỘC BACKUP TRANSCRIPT VÀO KÊNH LOG TRƯỚC KHI XÓA ---
  try {
    const transcriptLines = targetMessages.map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString('vi-VN');
      const attachments = m.attachments.map(a => a.url).join(', ');
      return `[${time}] ${m.author.tag} (${m.author.id}): ${m.content} ${attachments ? `[Files: ${attachments}]` : ''}`;
    }).reverse();

    const transcriptContent = `=== BẢN SAO LƯU TIN NHẮN BỊ XÓA (PURGE TRANSCRIPT) ===\n` +
      `Máy chủ: ${guild.name} (${guild.id})\n` +
      `Kênh: #${channel.name} (${channel.id})\n` +
      `Thời gian xóa: ${new Date().toLocaleString('vi-VN')}\n` +
      `Tổng số tin nhắn: ${targetMessages.length}\n` +
      `Bộ lọc: ${JSON.stringify({ userId, botsOnly, hasAttachments, containsWord })}\n` +
      `====================================================\n\n` +
      transcriptLines.join('\n');

    const logChannel = LOG_CHANNEL_ID ? (guild.channels.cache.get(LOG_CHANNEL_ID) || await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null)) : null;

    if (logChannel && logChannel.isTextBased()) {
      const attachment = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf-8'), {
        name: `purge-${channel.name}-${Date.now()}.txt`
      });

      const auditEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🗑️ Backup Transcript Tin Nhắn Đã Xóa')
        .setDescription(`Quản gia AI vừa thực hiện dọn dẹp **${targetMessages.length} tin nhắn** tại kênh <#${channel.id}>. Toàn bộ nội dung đã được sao lưu đính kèm bên dưới.`)
        .addFields(
          { name: 'Kênh thực hiện', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
          { name: 'Số tin nhắn', value: `${targetMessages.length}`, inline: true },
          { name: 'Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [auditEmbed], files: [attachment] }).catch(() => {});
    }
  } catch (err) {
    console.error('Lỗi sao lưu transcript tin nhắn:', err.message);
  }

  // Thực hiện xóa hàng loạt
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

  if (messageId) {
    const targetMsg = await channel.messages.fetch(messageId);
    if (!targetMsg) throw new Error(`Không tìm thấy tin nhắn cũ để sửa: ${messageId}`);
    const edited = await targetMsg.edit(payload);
    return { success: true, action: 'EDIT_EMBED', messageId: edited.id, targetId: edited.id, channelId };
  }

  const sent = await channel.send(payload);
  return { 
    success: true, 
    action: 'SEND_EMBED', 
    createdId: sent.id,
    targetId: sent.id, 
    messageId: sent.id, 
    channelId,
    afterState: { createdId: sent.id, channelId }
  };
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
      duration: Math.min(Math.max(Number(durationHours), 1), 168),
      allowMultiselect: Boolean(allowMultiselect)
    }
  };

  const sent = await channel.send(pollPayload);
  return { 
    success: true, 
    action: 'CREATE_POLL', 
    createdId: sent.id,
    targetId: sent.id, 
    messageId: sent.id, 
    channelId, 
    question,
    afterState: { createdId: sent.id, channelId }
  };
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
    return { success: true, action: 'PIN_MESSAGE', targetId: messageId, messageId };
  }
  if (action === 'unpin') {
    await message.unpin();
    return { success: true, action: 'UNPIN_MESSAGE', targetId: messageId, messageId };
  }
  if (action === 'react' && emoji) {
    await message.react(emoji);
    return { success: true, action: 'REACT_MESSAGE', targetId: messageId, messageId, emoji };
  }
  if (action === 'clearReactions') {
    await message.reactions.removeAll();
    return { success: true, action: 'CLEAR_REACTIONS', targetId: messageId, messageId };
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
