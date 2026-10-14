// src/events/guildMemberRemove.js
// Xử lý sự kiện khi có thành viên rời khỏi máy chủ

const { logMemberRemove } = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    await logMemberRemove(client, member).catch(err => {
      console.error('Lỗi khi ghi log thành viên rời:', err.message);
    });
  }
};
