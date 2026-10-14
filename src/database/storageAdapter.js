// src/database/storageAdapter.js
// Tầng truy xuất dữ liệu hợp nhất: Tự động điều hướng giữa MongoDB và JSON Storage an toàn

const fs = require('fs');
const path = require('path');
const { getDatabaseStatus } = require('./mongoose');
const Warning = require('./models/Warning');
const Settings = require('./models/Settings');

const jsonPath = path.join(__dirname, '..', '..', 'data', 'storage.json');

// Đọc dữ liệu JSON an toàn
function readJson() {
  try {
    if (!fs.existsSync(jsonPath)) {
      const defaultData = { warnings: {}, settings: {} };
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(raw || '{"warnings":{},"settings":{}}');
  } catch (err) {
    console.error('Lỗi đọc JSON storage:', err.message);
    return { warnings: {}, settings: {} };
  }
}

// Ghi dữ liệu JSON an toàn (Atomic Write với file tạm để chống Race Condition)
function writeJson(data) {
  try {
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${jsonPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, jsonPath);
  } catch (err) {
    console.error('Lỗi ghi JSON storage:', err.message);
  }
}

// 1. Lấy danh sách cảnh cáo của 1 thành viên
async function getWarnings(guildId, userId) {
  if (getDatabaseStatus()) {
    try {
      const docs = await Warning.find({ guildId, userId }).sort({ timestamp: -1 });
      return docs.map(d => ({
        reason: d.reason,
        moderator: d.moderator,
        timestamp: d.timestamp.toISOString()
      }));
    } catch (err) {
      console.error('Lỗi query MongoDB getWarnings:', err.message);
    }
  }

  // Fallback JSON
  const data = readJson();
  return (data.warnings[guildId] && data.warnings[guildId][userId]) || [];
}

// 2. Thêm cảnh cáo cho thành viên
async function addWarning(guildId, userId, reason, moderator) {
  const newWarn = {
    reason: reason || 'Không có lý do cụ thể',
    moderator: moderator,
    timestamp: new Date().toISOString()
  };

  if (getDatabaseStatus()) {
    try {
      await Warning.create({
        guildId,
        userId,
        reason: newWarn.reason,
        moderator: newWarn.moderator,
        timestamp: new Date()
      });
      const count = await Warning.countDocuments({ guildId, userId });
      return { warning: newWarn, total: count };
    } catch (err) {
      console.error('Lỗi lưu MongoDB addWarning:', err.message);
    }
  }

  // Fallback JSON
  const data = readJson();
  if (!data.warnings[guildId]) data.warnings[guildId] = {};
  if (!data.warnings[guildId][userId]) data.warnings[guildId][userId] = [];
  data.warnings[guildId][userId].push(newWarn);
  writeJson(data);
  return { warning: newWarn, total: data.warnings[guildId][userId].length };
}

// 3. Xóa cảnh cáo của thành viên
async function clearWarnings(guildId, userId) {
  if (getDatabaseStatus()) {
    try {
      const res = await Warning.deleteMany({ guildId, userId });
      return res.deletedCount || 0;
    } catch (err) {
      console.error('Lỗi xóa MongoDB clearWarnings:', err.message);
    }
  }

  // Fallback JSON
  const data = readJson();
  if (data.warnings[guildId] && data.warnings[guildId][userId]) {
    const count = data.warnings[guildId][userId].length;
    delete data.warnings[guildId][userId];
    writeJson(data);
    return count;
  }
  return 0;
}

// 4. Lấy cài đặt máy chủ
async function getSettings(guildId) {
  if (getDatabaseStatus()) {
    try {
      let doc = await Settings.findOne({ guildId });
      if (!doc) {
        doc = await Settings.create({ guildId });
      }
      return doc.toObject();
    } catch (err) {
      console.error('Lỗi query MongoDB getSettings:', err.message);
    }
  }

  // Fallback JSON
  const data = readJson();
  return (data.settings && data.settings[guildId]) || {};
}

// 5. Cập nhật cài đặt máy chủ
async function updateSettings(guildId, updates) {
  if (getDatabaseStatus()) {
    try {
      const doc = await Settings.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { new: true, upsert: true }
      );
      return doc.toObject();
    } catch (err) {
      console.error('Lỗi update MongoDB updateSettings:', err.message);
    }
  }

  // Fallback JSON
  const data = readJson();
  if (!data.settings) data.settings = {};
  if (!data.settings[guildId]) data.settings[guildId] = {};
  data.settings[guildId] = { ...data.settings[guildId], ...updates };
  writeJson(data);
  return data.settings[guildId];
}

module.exports = {
  getWarnings,
  addWarning,
  clearWarnings,
  getSettings,
  updateSettings
};
