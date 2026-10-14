// src/config/securityPolicy.js
// Phân loại mức độ rủi ro của từng công cụ và chính sách phê duyệt Zero-Trust

const RISK_LEVELS = {
  READ_ONLY: 'READ_ONLY', // Không thay đổi gì trên server (xem thông tin, audit log, tóm tắt, audit quyền)
  LOW: 'LOW',             // Thay đổi nhẹ (tạo kênh, tạo role, đổi màu, gửi thông báo embed)
  MEDIUM: 'MEDIUM',       // Thay đổi vừa (phân quyền kênh, di chuyển kênh/role, slowmode, timeout thành viên)
  CRITICAL: 'CRITICAL'    // Rủi ro cao (soft-delete kênh, dọn sạch thùng rác, xóa/ẩn role, quarantine/ban/kick, xóa tin nhắn > 5)
};

// Bảng ánh xạ từng Tool tới mức độ rủi ro
const TOOL_RISK_MAP = {
  // Read-only Tools
  queryAuditLogs: RISK_LEVELS.READ_ONLY,
  summarizeChannelConversation: RISK_LEVELS.READ_ONLY,
  inspectPruneCount: RISK_LEVELS.READ_ONLY,
  auditServerPermissions: RISK_LEVELS.READ_ONLY,

  // Low Risk Tools
  createChannel: RISK_LEVELS.LOW,
  createRole: RISK_LEVELS.LOW,
  sendOrEditEmbedAnnouncement: RISK_LEVELS.LOW,
  createPoll: RISK_LEVELS.LOW,
  managePinsAndReactions: RISK_LEVELS.LOW,
  cloneChannel: RISK_LEVELS.LOW,
  manageInvites: RISK_LEVELS.LOW,
  manageScheduledEvents: RISK_LEVELS.LOW,

  // Medium Risk Tools
  modifyChannel: RISK_LEVELS.MEDIUM,
  moveAndReorderChannels: RISK_LEVELS.MEDIUM,
  modifyRole: RISK_LEVELS.MEDIUM,
  reorderRoleHierarchy: RISK_LEVELS.MEDIUM,
  assignOrRemoveRole: RISK_LEVELS.MEDIUM,
  setChannelPermissionOverwrites: RISK_LEVELS.MEDIUM,
  lockOrUnlockChannels: RISK_LEVELS.MEDIUM,
  manageThreads: RISK_LEVELS.MEDIUM,
  manageWebhooks: RISK_LEVELS.MEDIUM,
  timeoutMember: RISK_LEVELS.MEDIUM,
  untimeoutMember: RISK_LEVELS.MEDIUM,
  manageNicknames: RISK_LEVELS.MEDIUM,
  voiceModeration: RISK_LEVELS.MEDIUM,
  manageWarnings: RISK_LEVELS.MEDIUM,
  modifyGuildSettings: RISK_LEVELS.MEDIUM,
  manageEmojisAndStickers: RISK_LEVELS.MEDIUM,
  manageSoundboard: RISK_LEVELS.MEDIUM,
  configureDiscordAutoMod: RISK_LEVELS.MEDIUM,
  configureAntiRaidAndSpam: RISK_LEVELS.MEDIUM,

  // Critical Risk Tools
  softDeleteChannel: RISK_LEVELS.CRITICAL,
  restoreDeletedChannel: RISK_LEVELS.CRITICAL,
  emptyTrashCategory: RISK_LEVELS.CRITICAL,
  softDeleteRole: RISK_LEVELS.CRITICAL,
  restoreRole: RISK_LEVELS.CRITICAL,
  quarantineMember: RISK_LEVELS.CRITICAL,
  unquarantineMember: RISK_LEVELS.CRITICAL,
  kickOrBanMember: RISK_LEVELS.CRITICAL,
  unbanMember: RISK_LEVELS.CRITICAL,
  smartPurgeMessages: RISK_LEVELS.CRITICAL,
  rollbackTransaction: RISK_LEVELS.CRITICAL
};

// Màu sắc Embed đại diện cho từng mức rủi ro
const RISK_COLORS = {
  [RISK_LEVELS.READ_ONLY]: 0x3498DB, // Xanh dương
  [RISK_LEVELS.LOW]: 0x2ECC71,       // Xanh lá
  [RISK_LEVELS.MEDIUM]: 0xF1C40F,    // Vàng cam
  [RISK_LEVELS.CRITICAL]: 0xE74C3C   // Đỏ cảnh báo
};

/**
 * Lấy mức độ rủi ro của 1 tool cụ thể
 */
function getToolRisk(toolName, args = {}) {
  // Nếu xóa tin nhắn trên 5 tin -> Bắt buộc là CRITICAL
  if (toolName === 'smartPurgeMessages') {
    const amount = Number(args.amount) || 0;
    return amount > 5 ? RISK_LEVELS.CRITICAL : RISK_LEVELS.MEDIUM;
  }
  return TOOL_RISK_MAP[toolName] || RISK_LEVELS.MEDIUM;
}

/**
 * Tính mức độ rủi ro tổng hợp của toàn bộ bản kế hoạch (Lấy mức cao nhất)
 */
function calculatePlanRisk(actions = []) {
  if (!actions || actions.length === 0) return RISK_LEVELS.READ_ONLY;

  let hasCritical = false;
  let hasMedium = false;
  let hasLow = false;
  let allReadOnly = true;

  for (const action of actions) {
    const risk = getToolRisk(action.toolName, action.args);
    if (risk !== RISK_LEVELS.READ_ONLY) {
      allReadOnly = false;
    }
    if (risk === RISK_LEVELS.CRITICAL) hasCritical = true;
    else if (risk === RISK_LEVELS.MEDIUM) hasMedium = true;
    else if (risk === RISK_LEVELS.LOW) hasLow = true;
  }

  if (allReadOnly) return RISK_LEVELS.READ_ONLY;
  if (hasCritical) return RISK_LEVELS.CRITICAL;
  if (hasMedium) return RISK_LEVELS.MEDIUM;
  if (hasLow) return RISK_LEVELS.LOW;
  return RISK_LEVELS.MEDIUM;
}

/**
 * Kiểm tra xem kế hoạch có yêu cầu hộp thoại xác nhận Modal (gõ XAC NHAN) không
 */
function requiresModalConfirmation(plan) {
  const risk = calculatePlanRisk(plan.actions);
  if (risk === RISK_LEVELS.CRITICAL) return true;

  // Nếu tác động trên 5 kênh hoặc thao tác trên 20 thành viên
  const channelActions = (plan.actions || []).filter(a => a.toolName.toLowerCase().includes('channel'));
  if (channelActions.length >= 5) return true;

  return false;
}

module.exports = {
  RISK_LEVELS,
  RISK_COLORS,
  getToolRisk,
  calculatePlanRisk,
  requiresModalConfirmation
};
