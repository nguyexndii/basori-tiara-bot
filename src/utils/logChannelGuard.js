// src/utils/logChannelGuard.js
// Bảo vệ các kênh log: Xóa tin nhắn thường (kể cả của Admin) và gửi thông báo điều hướng tự hủy sau 10s

const { LOG_CHANNELS, REDIRECT_SETTING_CHANNEL_ID } = require('../config/ids');

/**
 * Kiểm tra xem một kênh có phải là kênh log cần bảo vệ hay không
 * @param {import('discord.js').Channel} channel 
 * @returns {boolean}
 */
function isLogChannel(channel) {
  if (!channel) return false;
  // Không áp dụng cho kênh điều hướng cài đặt
  if (channel.id === REDIRECT_SETTING_CHANNEL_ID) return false;

  // Kiểm tra theo danh sách ID kênh log đã khai báo
  if (Array.isArray(LOG_CHANNELS) && LOG_CHANNELS.includes(channel.id)) {
    return true;
  }

  // Kiểm tra nếu tên kênh có chứa chữ 'log'
  const name = channel.name?.toLowerCase() || '';
  return name.includes('log');
}

// Lưu thời gian gửi thông báo cảnh báo gần nhất để tránh spam thông báo (key: `${channelId}:${userId}`)
const recentNotices = new Map();

// Tự động dọn dẹp cache sau mỗi 5 phút
setInterval(() => {
  const expiry = Date.now() - 30000;
  for (const [key, time] of recentNotices.entries()) {
    if (time < expiry) recentNotices.delete(key);
  }
}, 300000).unref();

/**
 * Xử lý tin nhắn trong kênh log: xóa tin nhắn thường và gửi tin nhắn điều hướng
 * @param {import('discord.js').Message} message 
 * @returns {Promise<boolean>} Trả về true nếu tin nhắn đã bị xử lý (xóa), false nếu là tin nhắn hợp lệ
 */
async function handleLogChannelMessage(message) {
  if (!message || message.author?.bot || !message.guild) return false;

  if (!isLogChannel(message.channel)) return false;

  // 1. Xóa ngay tin nhắn thường (Áp dụng cho mọi thành viên, bao gồm cả Admin)
  await message.delete().catch(() => {});

  // 2. Kiểm tra cooldown gửi thông báo nhắc nhở (5 giây / user / channel) để tránh spam thông báo
  const noticeKey = `${message.channelId}:${message.author.id}`;
  const now = Date.now();
  const lastNotice = recentNotices.get(noticeKey) || 0;

  if (now - lastNotice > 5000) {
    recentNotices.set(noticeKey, now);

    const targetChannelId = REDIRECT_SETTING_CHANNEL_ID || '1447095306079698984';
    const noticeMsg = await message.channel.send({
      content: `<@${message.author.id}> ⚠️ Kênh này chỉ dành riêng cho nhật ký hệ thống (log). Vui lòng chuyển sang kênh <#${targetChannelId}> nhé!`,
      allowedMentions: { users: [message.author.id] }
    }).catch(() => null);

    // 3. Tự động xóa thông báo nhắc nhở sau 10 giây để giữ kênh luôn gọn gàng
    if (noticeMsg) {
      setTimeout(async () => {
        await noticeMsg.delete().catch(() => {});
      }, 10000);
    }
  }

  return true;
}

module.exports = {
  isLogChannel,
  handleLogChannelMessage
};
