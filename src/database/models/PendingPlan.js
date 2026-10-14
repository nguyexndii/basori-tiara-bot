// src/database/models/PendingPlan.js
// Schema lưu trữ bản nháp kế hoạch đang chờ Admin duyệt qua Reaction 🔐 và Button

const mongoose = require('mongoose');

const PendingPlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true, index: true },
  adminId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  prompt: { type: String, required: true },
  riskLevel: { type: String, required: true },
  actions: { type: Array, default: [] },
  isReadOnly: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } } // Tự hủy sau thời gian hết hạn
});

module.exports = mongoose.model('PendingPlan', PendingPlanSchema);
