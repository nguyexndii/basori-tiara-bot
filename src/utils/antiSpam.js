// src/utils/antiSpam.js
// Thuật toán phát hiện & ngăn chặn Spam tin nhắn, Mass Mention và Emoji Spam

const { PermissionFlagsBits } = require('discord.js');
const { logSecurityAlert } = require('./logger');

// Lưu lịch sử tin nhắn của người dùng: userId -> Array<{ text, time }>
const userMessageHistory = new Map();
// Lưu số lần vi phạm trong vòng 1 phút: userId -> { count, lastViolation }
const userViolations = new Map();

/**
 * Xử lý kiểm tra tin nhắn chống spam
 * @param {import('discord.js').Message} message 
 * @param {import('discord.js').Client} client 
 */
async function handleMessage(message, client) {
  if (!message || message.author?.bot || !message.guild) return;

  const member = message.member;
  if (!member) return;

  // Bỏ qua nếu là Admin hoặc có quyền ManageMessages
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return;
  }

  const userId = message.author.id;
  const now = Date.now();
  const content = message.content.trim();

  // 1. Kiểm tra Mass Mention (> 5 user hoặc role)
  const mentionCount = (message.mentions.users?.size || 0) + (message.mentions.roles?.size || 0);
  if (mentionCount > 5) {
    await punishSpam(message, client, 'Gửi quá nhiều lượt tag (Mass Mention)', `Đã tag **${mentionCount}** người dùng/vai trò trong 1 tin nhắn.`);
    return;
  }

  // 2. Kiểm tra Emoji Spam (> 10 emoji liên tiếp)
  const customEmojiRegex = /<a?:[a-zA-Z0-9_]+:\d+>/g;
  const unicodeEmojiRegex = /\p{Extended_Pictographic}/gu;
  const totalEmojis = (content.match(customEmojiRegex)?.length || 0) + (content.match(unicodeEmojiRegex)?.length || 0);
  if (totalEmojis > 10) {
    await punishSpam(message, client, 'Spam Emoji quá tải', `Tin nhắn chứa tới **${totalEmojis}** biểu tượng cảm xúc.`);
    return;
  }

  // 3. Quản lý lịch sử tin nhắn để phát hiện Flood & Duplicate
  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, []);
  }

  const history = userMessageHistory.get(userId);
  history.push({ text: content, time: now });

  // Chỉ giữ các tin nhắn trong vòng 5 giây gần nhất
  const recentMessages = history.filter(m => now - m.time < 5000);
  userMessageHistory.set(userId, recentMessages);

  // A. Kiểm tra Flood: > 5 tin nhắn trong 3 giây
  const last3sMessages = recentMessages.filter(m => now - m.time < 3000);
  if (last3sMessages.length >= 5) {
    await punishSpam(message, client, 'Tần suất gửi tin quá nhanh (Flood)', `Đã gửi **${last3sMessages.length}** tin nhắn chỉ trong vòng 3 giây.`);
    return;
  }

  // B. Kiểm tra Duplicate: Gửi cùng 1 nội dung từ 3 lần trở lên trong 10 giây
  if (content.length > 2) {
    const duplicateCount = recentMessages.filter(m => m.text.toLowerCase() === content.toLowerCase()).length;
    if (duplicateCount >= 3) {
      await punishSpam(message, client, 'Spam tin nhắn trùng lặp', `Đã gửi cùng 1 nội dung **${duplicateCount}** lần liên tiếp.`);
      return;
    }
  }
}

// Hàm xử lý phạt vi phạm spam
async function punishSpam(message, client, reason, details) {
  const member = message.member;
  const channel = message.channel;
  const userId = message.author.id;
  const now = Date.now();

  // 1. Xóa ngay tin nhắn vi phạm
  await message.delete().catch(() => {});

  // 2. Kiểm tra lịch sử vi phạm
  let record = userViolations.get(userId) || { count: 0, lastViolation: 0 };
  if (now - record.lastViolation > 60000) {
    record.count = 0; // Reset sau 1 phút nếu không tái phạm
  }
  record.count += 1;
  record.lastViolation = now;
  userViolations.set(userId, record);

  // 3. Nếu tái phạm lần 2 trong 1 phút -> Tự động Timeout 10 phút
  if (record.count >= 2) {
    if (member.moderatable) {
      await member.timeout(10 * 60 * 1000, `Hệ thống Anti-Spam: ${reason}`).catch(() => {});
      
      const warnMsg = await channel.send({
        content: `⛔ **${message.author}** đã bị tạm thời cách ly (Timeout 10 phút) do tiếp tục tái phạm hành vi spam!`,
        allowedMentions: { parse: ['users'] }
      }).catch(() => null);

      if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 7000);

      await logSecurityAlert(client, {
        title: 'Tự Động Cách Ly (Timeout) Thành Viên Spam',
        description: `Thành viên **${message.author.tag}** (\`${userId}\`) đã bị cách ly 10 phút do tái phạm spam.`,
        fields: [
          { name: '🛑 Lý do', value: reason, inline: true },
          { name: '📍 Kênh vi phạm', value: `<#${channel.id}>`, inline: true },
          { name: 'ℹ️ Chi tiết', value: details, inline: false }
        ]
      });
      return;
    }
  }

  // Cảnh cáo lần đầu (gửi tin tự xóa sau 5s)
  const warnMsg = await channel.send({
    content: `⚠️ **${message.author}**, vui lòng không gửi tin nhắn spam quá nhanh hoặc mass mention! (Tin nhắn vi phạm đã bị xóa).`,
    allowedMentions: { parse: ['users'] }
  }).catch(() => null);

  if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  // Ghi log bảo mật vào kênh chỉ định
  await logSecurityAlert(client, {
    title: 'Phát Hiện & Chặn Tin Nhắn Spam',
    description: `Đã xóa tin nhắn spam từ **${message.author.tag}** (\`${userId}\`).`,
    color: 0xFEE75C,
    fields: [
      { name: '🛑 Lý do', value: reason, inline: true },
      { name: '📍 Kênh', value: `<#${channel.id}>`, inline: true },
      { name: 'ℹ️ Chi tiết', value: details, inline: false },
      { name: '💬 Nội dung bị xóa', value: `\`\`\`${message.content.slice(0, 300) || '(Không có văn bản)'}\`\`\``, inline: false }
    ]
  });
}

module.exports = { handleMessage };
