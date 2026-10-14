// src/config/version.js
// Quản lý phiên bản và dấu vết Build để nhận diện bản cập nhật

module.exports = {
  version: '1.1.0',
  buildId: '20261014-02',
  buildTime: '2026-10-14 11:50 (GMT+7)',
  getBuildBadge() {
    return `v${this.version} • Build: ${this.buildId}`;
  },
  getFullVersion() {
    return `v${this.version} (Build: ${this.buildId} - ${this.buildTime})`;
  }
};
