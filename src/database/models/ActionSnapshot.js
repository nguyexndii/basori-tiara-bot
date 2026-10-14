// src/database/models/ActionSnapshot.js
// Schema lưu trữ bản chụp trạng thái Before/After để hỗ trợ Rollback 100%

const mongoose = require('mongoose');

const SingleActionSchema = new mongoose.Schema({
  stepIndex: { type: Number, required: true },
  toolName: { type: String, required: true },
  targetType: { 
    type: String, 
    enum: ['CHANNEL', 'ROLE', 'MEMBER', 'GUILD', 'MESSAGE', 'AUTOMOD', 'SYSTEM'],
    required: true 
  },
  targetId: { type: String, default: null },
  beforeState: { type: mongoose.Schema.Types.Mixed, default: null },
  afterState: { type: mongoose.Schema.Types.Mixed, default: null },
  reversible: { type: Boolean, default: true }
}, { _id: false });

const ActionSnapshotSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true, index: true },
  adminId: { type: String, required: true },
  prompt: { type: String, required: true },
  riskLevel: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['IN_PROGRESS', 'COMPLETED', 'ROLLED_BACK', 'ABORTED', 'FAILED'],
    default: 'IN_PROGRESS' 
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  rolledBackAt: { type: Date },
  actions: [SingleActionSchema]
});

module.exports = mongoose.model('ActionSnapshot', ActionSnapshotSchema);
