// src/config/emojis.js
// Quản lý Application Emojis & Pixel Art Fallbacks

const FALLBACKS = {
  icon_success: '🟢',
  icon_error: '🔴',
  icon_warn: '⚠️',
  icon_ban: '⚔️',
  icon_kick: '👢',
  icon_timeout: '⏳',
  icon_clear: '🧹',
  icon_slowmode: '🐢',
  icon_lock: '🔒',
  icon_unlock: '🔓',
  icon_role: '🏷️',
  icon_owner: '👑',
  icon_member: '👤',
  icon_channel: '💬',
  icon_calendar: '📅',
  icon_announce: '📢',
  icon_poll: '📊',
  icon_id: '🆔',
  icon_join: '📥'
};

function getEmoji(client, name) {
  try {
    if (client?.application?.emojis) {
      const found = client.application.emojis.cache.find(e => e.name === name);
      if (found) return found.toString();
    }
  } catch (err) {
    // ignore
  }
  return FALLBACKS[name] || '';
}

module.exports = { getEmoji, FALLBACKS };
