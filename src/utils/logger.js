// src/utils/logger.js
// Hệ thống ghi log tập trung: Console, File .log và Kênh Discord
// - Kênh Log Quản trị & Tin nhắn: 1559750487299850331
// - Kênh Trạng thái Sức khỏe & Reconnect: 1547449482835394640 (Tag Admin 875358286487097395)

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { LOG_CHANNEL_ID, STATUS_LOG_CHANNEL_ID, NOTIFY_ADMIN_ID } = require('../config/ids');
const version = require('../config/version');

const logFilePath = path.join(__dirname, '..', '..', 'bot-error.log');

// Ghi log vào file cục bộ
function appendLogFile(level, message, details = '') {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message} ${details ? JSON.stringify(details) : ''}\n`;
    fs.appendFileSync(logFilePath, line, 'utf-8');
  } catch (err) {
    console.error('Không thể ghi file log:', err.message);
  }
}

// Lấy channel log chung (quản trị, tin nhắn, anti-spam)
async function getLogChannel(client) {
  if (!client || !LOG_CHANNEL_ID) return null;
  try {
    const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    return channel;
  } catch {
    return null;
  }
}

// Lấy channel riêng cho trạng thái sức khỏe bot (online / dc / reconnect)
async function getStatusChannel(client) {
  const targetId = STATUS_LOG_CHANNEL_ID || '1547449482835394640';
  if (!client) return null;
  try {
    const channel = client.channels.cache.get(targetId) || await client.channels.fetch(targetId).catch(() => null);
    return channel;
  } catch {
    return null;
  }
}

// 1. Log khi Bot khởi động trực tuyến (Gửi kênh 1547449482835394640 và tag Admin 875358286487097395)
async function logBotReady(client) {
  console.log(`🤖 [ONLINE] Bot đã đăng nhập: ${client.user.tag}`);
  const channel = await getStatusChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🟢 Bot Đã Khởi Động Trực Tuyến')
    .setDescription(`**${client.user.tag}** đã kết nối thành công và sẵn sàng quản trị server!`)
    .addFields(
      { name: '🏷️ Phiên bản (Build)', value: `\`${version.getFullVersion()}\``, inline: false },
      { name: '🌐 Máy chủ phục vụ', value: `${client.guilds.cache.size}`, inline: true },
      { name: '💓 WebSocket Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
      { name: '📅 Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setTimestamp();

  await channel.send({
    content: `<@${NOTIFY_ADMIN_ID}> 🔔 **Bot đã kết nối trực tuyến!**`,
    embeds: [embed],
    allowedMentions: { users: [NOTIFY_ADMIN_ID] }
  }).catch(() => {});
}

// 2. Log khi bot bị ngắt kết nối (DC) và kết nối lại thành công (Reconnect / Resume)
async function logBotReconnected(client, shardId = 0) {
  console.log(`🔄 [RECONNECTED] Bot đã khôi phục kết nối WebSocket (Shard ${shardId})`);
  const channel = await getStatusChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x00B0F4)
    .setTitle('🔄 Bot Đã Khôi Phục Kết Nối (Reconnected)')
    .setDescription(`**${client.user.tag}** vừa bị ngắt kết nối tạm thời và đã tự động kết nối lại thành công!`)
    .addFields(
      { name: '💓 WebSocket Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
      { name: '📅 Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setTimestamp();

  await channel.send({
    content: `<@${NOTIFY_ADMIN_ID}> ⚠️ **Bot vừa bị ngắt kết nối và đã kết nối lại thành công!**`,
    embeds: [embed],
    allowedMentions: { users: [NOTIFY_ADMIN_ID] }
  }).catch(() => {});
}

// 3. Log khi bot bị ngắt kết nối gateway
async function logBotDisconnected(client, event, shardId = 0) {
  console.warn(`🛑 [DISCONNECT] Bot bị ngắt kết nối Gateway (Shard ${shardId}):`, event?.reason || event?.code || 'Không rõ');
  appendLogFile('WARN', `Gateway Disconnect Shard ${shardId}`, event);
}

// 2. Log khi người dùng gọi bất kỳ lệnh Slash nào
async function logCommandUsage(client, interaction) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const optionsStr = interaction.options.data.map(opt => {
    if (opt.value !== undefined) return `${opt.name}: \`${opt.value}\``;
    return opt.name;
  }).join(', ') || 'Không có';

  const embed = new EmbedBuilder()
    .setColor(0x00B0F4)
    .setTitle('⚡ Lệnh Slash Được Thực Thi')
    .addFields(
      { name: '💻 Lệnh', value: `\`/${interaction.commandName}\``, inline: true },
      { name: '👤 Người dùng', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
      { name: '📍 Kênh', value: `<#${interaction.channelId}>`, inline: true },
      { name: '⚙️ Tham số', value: optionsStr.slice(0, 1024), inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 3. Log hành động quản trị (Ban, Kick, Timeout, Warn, Lock, Clear...)
async function logModAction(client, { action, target, moderator, reason, extra = '' }) {
  console.log(`[MOD-LOG] [${action}] ${moderator?.tag || moderator} -> ${target?.tag || target}: ${reason || 'Không có lý do'}`);
  
  const channel = await getLogChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🛡️ Nhật Ký Quản Trị: ${action}`)
    .addFields(
      { name: '👤 Đối tượng', value: `${target} (\`${target?.id || target}\`)`, inline: true },
      { name: '👮 Người thực hiện', value: `${moderator} (\`${moderator?.id || moderator}\`)`, inline: true },
      { name: '📝 Lý do', value: reason || 'Không có lý do cụ thể', inline: false }
    )
    .setTimestamp();

  if (extra) {
    embed.addFields({ name: 'ℹ️ Chi tiết', value: String(extra).slice(0, 1024), inline: false });
  }

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 4. Log cảnh báo an ninh (Anti-Spam / Anti-Raid)
async function logSecurityAlert(client, { title, description, color = 0xED4245, fields = [] }) {
  console.warn(`[SECURITY-ALERT] ${title} - ${description}`);
  appendLogFile('WARN', title, { description, fields });

  const channel = await getLogChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🚨 ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields && fields.length > 0) {
    embed.addFields(fields);
  }

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 5. Log lỗi hệ thống (Chống sập bot) - Báo trực tiếp kênh sức khỏe và tag Admin
async function logSystemError(client, errorType, error) {
  const errMsg = error?.stack || error?.message || String(error);
  console.error('❌ [HỆ THỐNG] [%s]:', errorType, errMsg);
  appendLogFile('ERROR', errorType, errMsg);

  const channel = await getStatusChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`🚨 Cảnh Báo Lỗi Hệ Thống: ${errorType}`)
    .setDescription(`\`\`\`js\n${errMsg.slice(0, 1900)}\n\`\`\``)
    .setTimestamp();

  await channel.send({
    content: `<@${NOTIFY_ADMIN_ID}> ⚠️ **Cảnh báo lỗi hệ thống / Ngoại lệ chưa xử lý!**`,
    embeds: [embed],
    allowedMentions: { users: [NOTIFY_ADMIN_ID] }
  }).catch(() => {});
}

// 6. Log thành viên mới tham gia server
async function logMemberJoin(client, member) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('📥 Thành Viên Mới Tham Gia')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Người dùng', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: '📅 Tạo tài khoản', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '👥 Thành viên thứ', value: `#${member.guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 7. Log thành viên rời khỏi máy chủ
async function logMemberRemove(client, member) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('📤 Thành Viên Rời Khỏi Máy Chủ')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 Người dùng', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: '📅 Đã tham gia', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Không rõ', inline: true },
      { name: '👥 Số lượng còn lại', value: `${member.guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 8. Log tin nhắn bị xóa
async function logMessageDelete(client, message) {
  if (!message || message.author?.bot || message.channelId === LOG_CHANNEL_ID) return;
  const channel = await getLogChannel(client);
  if (!channel) return;

  const content = message.content ? message.content.slice(0, 1024) : '(Không có văn bản hoặc chứa tệp đính kèm)';

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ Tin Nhắn Bị Xóa')
    .addFields(
      { name: '👤 Người gửi', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
      { name: '📍 Kênh', value: `<#${message.channelId}>`, inline: true },
      { name: '💬 Nội dung', value: `\`\`\`${content}\`\`\``, inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

// 9. Log tin nhắn được chỉnh sửa
async function logMessageUpdate(client, oldMessage, newMessage) {
  if (!newMessage || newMessage.author?.bot || newMessage.channelId === LOG_CHANNEL_ID) return;
  if (oldMessage?.content === newMessage?.content) return;

  const channel = await getLogChannel(client);
  if (!channel) return;

  const oldText = oldMessage?.content ? oldMessage.content.slice(0, 500) : '(Không rõ nội dung cũ)';
  const newText = newMessage?.content ? newMessage.content.slice(0, 500) : '(Trống)';

  const embed = new EmbedBuilder()
    .setColor(0x00B0F4)
    .setTitle('✏️ Tin Nhắn Được Chỉnh Sửa')
    .addFields(
      { name: '👤 Người gửi', value: `${newMessage.author.tag} (\`${newMessage.author.id}\`)`, inline: true },
      { name: '📍 Kênh', value: `<#${newMessage.channelId}>`, inline: true },
      { name: '🔗 Link', value: `[Xem tin nhắn](${newMessage.url})`, inline: true },
      { name: '📝 Nội dung cũ', value: `\`\`\`${oldText}\`\`\``, inline: false },
      { name: '✨ Nội dung mới', value: `\`\`\`${newText}\`\`\``, inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

module.exports = {
  logBotReady,
  logBotReconnected,
  logBotDisconnected,
  logCommandUsage,
  logModAction,
  logSecurityAlert,
  logSystemError,
  logMemberJoin,
  logMemberRemove,
  logMessageDelete,
  logMessageUpdate,
  appendLogFile
};
