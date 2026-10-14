// src/utils/rateLimiter.js
// Quản lý Cooldown cho từng lệnh Slash theo từng người dùng

const cooldowns = new Map();

/**
 * Kiểm tra xem người dùng có đang bị Cooldown lệnh hay không
 * @param {string} commandName 
 * @param {string} userId 
 * @param {number} cooldownSeconds 
 * @returns {number|null} Số giây còn lại nếu đang bị cooldown, hoặc null nếu hợp lệ
 */
function checkCooldown(commandName, userId, cooldownSeconds = 3) {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(commandName);
  const cooldownAmount = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return null;
}

/**
 * Hàm tạm dừng bất đồng bộ (delay)
 * @param {number} ms Số mili-giây cần chờ
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { checkCooldown, sleep };
