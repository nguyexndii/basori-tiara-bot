// src/database/models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  welcomeChannelId: { type: String, default: null },
  antiRaidEnabled: { type: Boolean, default: true },
  antiSpamEnabled: { type: Boolean, default: true },
  modLogChannelId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
