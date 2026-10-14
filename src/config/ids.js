// src/config/ids.js
// Quản lý tập trung các ID cấu hình và Danh sách Bất khả xâm phạm

const { LOG_CHANNEL_ID, ADMIN_PROMPT_CHANNEL_ID, OWNER_ADMIN_IDS } = require('./env');

const PROTECTED_CHANNEL_IDS = [
  LOG_CHANNEL_ID,
  ADMIN_PROMPT_CHANNEL_ID
].filter(Boolean);

const PROTECTED_ROLE_IDS = [
  // Khai báo thêm các Role Quản Trị tối cao hoặc Role Bot nếu cần
].filter(Boolean);

/**
 * Kiểm tra xem một ID (Kênh hoặc Role) có nằm trong danh sách được bảo vệ tuyệt đối hay không.
 * Nếu có, ném lỗi chặn đứng ngay lập tức để không ai (kể cả AI) có thể xóa hoặc sửa.
 */
function assertNotProtected(targetId, targetName = 'đối tượng') {
  if (!targetId) return;
  if (PROTECTED_CHANNEL_IDS.includes(targetId)) {
    throw new Error(`🚫 [BẢO VỆ TỐI CAO] Kênh '${targetName}' (${targetId}) là kênh hệ thống bất khả xâm phạm! Không thể xóa hoặc sửa đổi.`);
  }
  if (PROTECTED_ROLE_IDS.includes(targetId)) {
    throw new Error(`🚫 [BẢO VỆ TỐI CAO] Vai trò '${targetName}' (${targetId}) là vai trò được bảo vệ! Không thể xóa hoặc sửa đổi.`);
  }
}

module.exports = {
  LOG_CHANNEL_ID,
  ADMIN_PROMPT_CHANNEL_ID,
  OWNER_ADMIN_IDS,
  PROTECTED_CHANNEL_IDS,
  PROTECTED_ROLE_IDS,
  assertNotProtected
};
