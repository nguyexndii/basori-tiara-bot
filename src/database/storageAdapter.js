// src/database/storageAdapter.js
// Tầng truy xuất dữ liệu hợp nhất: Tự động điều hướng giữa MongoDB và JSON Storage an toàn

const fs = require('fs');
const path = require('path');
const { getDatabaseStatus } = require('./mongoose');
const Warning = require('./models/Warning');
const Settings = require('./models/Settings');
const ActionSnapshot = require('./models/ActionSnapshot');
const PendingPlan = require('./models/PendingPlan');

const jsonPath = path.join(__dirname, '..', '..', 'data', 'storage.json');

// Đọc dữ liệu JSON an toàn
function readJson() {
  try {
    if (!fs.existsSync(jsonPath)) {
      const defaultData = { warnings: {}, settings: {}, snapshots: {}, pendingPlans: {} };
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed.warnings) parsed.warnings = {};
    if (!parsed.settings) parsed.settings = {};
    if (!parsed.snapshots) parsed.snapshots = {};
    if (!parsed.pendingPlans) parsed.pendingPlans = {};
    return parsed;
  } catch (err) {
    console.error('Lỗi đọc JSON storage:', err.message);
    return { warnings: {}, settings: {}, snapshots: {}, pendingPlans: {} };
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

  const data = readJson();
  if (!data.settings) data.settings = {};
  if (!data.settings[guildId]) data.settings[guildId] = {};
  data.settings[guildId] = { ...data.settings[guildId], ...updates };
  writeJson(data);
  return data.settings[guildId];
}

// ==================== QUẢN LÝ ACTION SNAPSHOT (ROLLBACK 100%) ====================

// 6. Lưu hoặc cập nhật ActionSnapshot
async function saveActionSnapshot(snapshotData) {
  if (getDatabaseStatus()) {
    try {
      const doc = await ActionSnapshot.findOneAndUpdate(
        { transactionId: snapshotData.transactionId },
        { $set: snapshotData },
        { new: true, upsert: true }
      );
      return doc.toObject();
    } catch (err) {
      console.error('Lỗi lưu ActionSnapshot MongoDB:', err.message);
    }
  }

  const data = readJson();
  if (!data.snapshots) data.snapshots = {};
  data.snapshots[snapshotData.transactionId] = snapshotData;
  writeJson(data);
  return snapshotData;
}

// 7. Lấy ActionSnapshot theo transactionId
async function getActionSnapshot(transactionId) {
  if (getDatabaseStatus()) {
    try {
      const doc = await ActionSnapshot.findOne({ transactionId });
      if (doc) return doc.toObject();
    } catch (err) {
      console.error('Lỗi lấy ActionSnapshot MongoDB:', err.message);
    }
  }

  const data = readJson();
  return (data.snapshots && data.snapshots[transactionId]) || null;
}

// 8. Cập nhật trạng thái ActionSnapshot (COMPLETED, ROLLED_BACK, ABORTED, FAILED)
async function updateActionSnapshotStatus(transactionId, status, additionalFields = {}) {
  const updates = { status, ...additionalFields };
  if (status === 'COMPLETED') updates.completedAt = new Date();
  if (status === 'ROLLED_BACK') updates.rolledBackAt = new Date();

  if (getDatabaseStatus()) {
    try {
      const doc = await ActionSnapshot.findOneAndUpdate(
        { transactionId },
        { $set: updates },
        { new: true }
      );
      if (doc) return doc.toObject();
    } catch (err) {
      console.error('Lỗi cập nhật ActionSnapshot status MongoDB:', err.message);
    }
  }

  const data = readJson();
  if (data.snapshots && data.snapshots[transactionId]) {
    data.snapshots[transactionId] = { ...data.snapshots[transactionId], ...updates };
    writeJson(data);
    return data.snapshots[transactionId];
  }
  return null;
}

// 8b. Lấy danh sách ActionSnapshot hoàn thành gần nhất của Guild
async function getLatestActionSnapshots(guildId, limit = 5) {
  if (getDatabaseStatus()) {
    try {
      const docs = await ActionSnapshot.find({ guildId, status: 'COMPLETED' })
        .sort({ completedAt: -1, createdAt: -1 })
        .limit(limit);
      return docs.map(d => d.toObject());
    } catch (err) {
      console.error('Lỗi lấy latest ActionSnapshots MongoDB:', err.message);
    }
  }

  const data = readJson();
  const all = Object.values(data.snapshots || {})
    .filter(s => s.guildId === guildId && s.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
    .slice(0, limit);
  return all;
}

// ==================== QUẢN LÝ PENDING PLAN (BẢN NHÁP CHỜ DUYỆT) ====================

// 9. Lưu PendingPlan
async function savePendingPlan(planData) {
  if (getDatabaseStatus()) {
    try {
      const doc = await PendingPlan.findOneAndUpdate(
        { planId: planData.planId },
        { $set: planData },
        { new: true, upsert: true }
      );
      return doc.toObject();
    } catch (err) {
      console.error('Lỗi lưu PendingPlan MongoDB:', err.message);
    }
  }

  const data = readJson();
  if (!data.pendingPlans) data.pendingPlans = {};
  data.pendingPlans[planData.planId] = planData;
  writeJson(data);
  return planData;
}

// 10. Lấy PendingPlan theo planId
async function getPendingPlan(planId) {
  if (getDatabaseStatus()) {
    try {
      const doc = await PendingPlan.findOne({ planId });
      if (doc) return doc.toObject();
    } catch (err) {
      console.error('Lỗi lấy PendingPlan MongoDB:', err.message);
    }
  }

  const data = readJson();
  const plan = data.pendingPlans && data.pendingPlans[planId];
  if (plan) {
    // Kiểm tra hết hạn ở JSON
    if (new Date(plan.expiresAt) < new Date()) {
      delete data.pendingPlans[planId];
      writeJson(data);
      return null;
    }
    return plan;
  }
  return null;
}

// 11. Xóa PendingPlan
async function deletePendingPlan(planId) {
  if (getDatabaseStatus()) {
    try {
      await PendingPlan.deleteOne({ planId });
      return true;
    } catch (err) {
      console.error('Lỗi xóa PendingPlan MongoDB:', err.message);
    }
  }

  const data = readJson();
  if (data.pendingPlans && data.pendingPlans[planId]) {
    delete data.pendingPlans[planId];
    writeJson(data);
    return true;
  }
  return false;
}

module.exports = {
  getWarnings,
  addWarning,
  clearWarnings,
  getSettings,
  updateSettings,
  saveActionSnapshot,
  getActionSnapshot,
  getLatestActionSnapshots,
  updateActionSnapshotStatus,
  savePendingPlan,
  getPendingPlan,
  deletePendingPlan
};
