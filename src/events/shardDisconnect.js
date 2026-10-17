// src/events/shardDisconnect.js
// Ghi nhận khi Bot bị ngắt kết nối khỏi Discord Gateway

const { logBotDisconnected } = require('../utils/logger');

module.exports = {
  name: 'shardDisconnect',
  async execute(event, shardId, client) {
    await logBotDisconnected(client, event, shardId).catch(() => {});
  }
};
