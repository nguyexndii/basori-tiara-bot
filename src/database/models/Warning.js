// src/database/models/Warning.js
const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  reason: { type: String, default: 'Không có lý do cụ thể' },
  moderator: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Warning || mongoose.model('Warning', warningSchema);
