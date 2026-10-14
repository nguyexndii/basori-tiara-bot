// src/utils/antiRaid.js
// Thuật toán phát hiện hành vi Join Raid đột biến (Nhiều tài khoản vào cùng lúc)

const { logSecurityAlert } = require('./logger');

// Lưu lịch sử join của guild: guildId -> Array<timestamp>
const joinHistory = new Map();
// Đánh dấu thời điểm kích hoạt raid gần nhất để tránh spam alert: guildId -> timestamp
const lastAlertTime = new Map();

/**
 * Xử lý sự kiện khi có thành viên mới vào server
 * @param {import('discord.js').GuildMember} member 
 * @param {import('discord.js').Client} client 
 */
async function handleMemberJoin(member, client) {
  if (!member || !member.guild) return;

  const guildId = member.guild.id;
  const now = Date.now();

  if (!joinHistory.has(guildId)) {
    joinHistory.set(guildId, []);
  }

  const history = joinHistory.get(guildId);
  history.push({ userId: member.id, userTag: member.user.tag, time: now });

  // Giữ lại các lượt join trong 10 giây gần nhất
  const recentJoins = history.filter(j => now - j.time < 10000);
  joinHistory.set(guildId, recentJoins);

  // Nếu có hơn 5 thành viên tham gia trong vòng 10 giây -> Kích hoạt cảnh báo Raid
  if (recentJoins.length >= 5) {
    const lastAlert = lastAlertTime.get(guildId) || 0;
    // Không gửi cảnh báo liên tục quá 1 lần mỗi 30 giây
    if (now - lastAlert > 30000) {
      lastAlertTime.set(guildId, now);

      const recentUserList = recentJoins.slice(-5).map(j => `• ${j.userTag} (\`${j.userId}\`)`).join('\n');

      await logSecurityAlert(client, {
        title: 'CẢNH BÁO NGUY HIỂM: PHÁT HIỆN JOIN RAID ĐỘT BIẾN!',
        description: `Máy chủ **${member.guild.name}** vừa ghi nhận **${recentJoins.length} tài khoản mới** tham gia chỉ trong vòng 10 giây!`,
        color: 0xED4245,
        fields: [
          { name: '👥 Tài khoản mới tham gia gần nhất', value: recentUserList || 'Đang cập nhật', inline: false },
          { name: '🛡️ Khuyến nghị bảo vệ', value: 'Ban Quản Trị nên kiểm tra ngay hoặc dùng lệnh `/lock` tạm thời khóa các kênh chat nếu phát hiện botnet phá hoại.', inline: false }
        ]
      });
    }
  }
}

module.exports = { handleMemberJoin };
