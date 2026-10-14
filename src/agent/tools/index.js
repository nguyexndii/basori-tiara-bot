// src/agent/tools/index.js
// Tổng hợp toàn bộ Schema Công cụ (Function Declarations) cho Gemini AI & Bảng điều phối Thực thi

const channelTools = require('./channelTools');
const roleTools = require('./roleTools');
const memberTools = require('./memberTools');
const messageTools = require('./messageTools');
const guildAssetTools = require('./guildAssetTools');
const securityAuditTools = require('./securityAuditTools');

// 1. Khai báo Schema Function Declarations chuẩn Gemini API
const functionDeclarations = [
  // --- KÊNH & DANH MỤC ---
  {
    name: 'createChannel',
    description: 'Tạo Kênh mới hoặc Danh mục (Category) mới trên máy chủ',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Tên kênh hoặc danh mục cần tạo' },
        type: { 
          type: 'STRING', 
          description: 'Loại kênh: text, category, voice, announcement, stage, forum',
          enum: ['text', 'category', 'voice', 'announcement', 'stage', 'forum']
        },
        parentId: { type: 'STRING', description: 'ID của Category cha (nếu muốn kênh nằm trong 1 Category, hoặc $STEP_N.id)' },
        topic: { type: 'STRING', description: 'Chủ đề của kênh' },
        nsfw: { type: 'BOOLEAN', description: 'Bật hoặc tắt gắn cờ 18+ (NSFW)' },
        slowmode: { type: 'INTEGER', description: 'Thời gian chờ gửi tin nhắn Slowmode tính bằng giây (0 - 21600)' }
      },
      required: ['name']
    }
  },
  {
    name: 'modifyChannel',
    description: 'Chỉnh sửa cài đặt của một kênh đã có (đổi tên, topic, chuyển category, slowmode, nsfw)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID của kênh cần sửa' },
        name: { type: 'STRING', description: 'Tên mới của kênh' },
        topic: { type: 'STRING', description: 'Chủ đề mới' },
        parentId: { type: 'STRING', description: 'ID danh mục cha mới' },
        slowmode: { type: 'INTEGER', description: 'Thời gian chờ Slowmode' },
        nsfw: { type: 'BOOLEAN', description: 'Bật/tắt NSFW' }
      },
      required: ['channelId']
    }
  },
  {
    name: 'moveAndReorderChannels',
    description: 'Di chuyển vị trí hoặc đổi danh mục của kênh',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh cần di chuyển' },
        parentId: { type: 'STRING', description: 'ID danh mục cha mới (nếu muốn chuyển)' },
        position: { type: 'INTEGER', description: 'Vị trí sắp xếp mới' }
      },
      required: ['channelId']
    }
  },
  {
    name: 'cloneChannel',
    description: 'Nhân bản một kênh (sao chép toàn bộ quyền và cấu hình sang kênh mới)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh gốc cần sao chép' },
        newName: { type: 'STRING', description: 'Tên của kênh nhân bản mới' }
      },
      required: ['channelId']
    }
  },
  {
    name: 'softDeleteChannel',
    description: 'Xóa mềm Kênh (chuyển an toàn vào Thùng Rác để bảo toàn 100% tin nhắn, không mất dữ liệu)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh cần xóa mềm' },
        reason: { type: 'STRING', description: 'Lý do xóa kênh' }
      },
      required: ['channelId']
    }
  },
  {
    name: 'emptyTrashCategory',
    description: 'Dọn sạch Thùng Rác (Liệt kê hoặc xóa vĩnh viễn toàn bộ các kênh đang nằm trong danh mục Thùng Rác)',
    parameters: {
      type: 'OBJECT',
      properties: {
        confirmPermanentDelete: { type: 'BOOLEAN', description: 'Đặt true để xác nhận xóa vĩnh viễn toàn bộ các kênh trong thùng rác' }
      }
    }
  },
  {
    name: 'lockOrUnlockChannels',
    description: 'Khóa hoặc Mở khóa gửi tin nhắn trên kênh cho @everyone khi có sự cố',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh cần khóa hoặc mở khóa' },
        lock: { type: 'BOOLEAN', description: 'true là Khóa, false là Mở khóa' },
        reason: { type: 'STRING', description: 'Lý do khóa/mở' }
      },
      required: ['channelId', 'lock']
    }
  },
  {
    name: 'manageThreads',
    description: 'Tạo, khóa hoặc đóng lưu trữ (archive/unarchive) Thread thảo luận con',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh mẹ' },
        action: { type: 'STRING', enum: ['create', 'archive', 'unarchive', 'lock'] },
        name: { type: 'STRING', description: 'Tên thread khi tạo mới' },
        threadId: { type: 'STRING', description: 'ID của thread khi muốn khóa/archive' }
      },
      required: ['channelId', 'action']
    }
  },

  // --- VAI TRÒ & PHÂN QUYỀN ---
  {
    name: 'createRole',
    description: 'Tạo Role mới trên server (Tuyệt đối không cấp quyền Administrator)',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Tên của Role' },
        color: { type: 'STRING', description: 'Mã màu HEX (vd: #FF5733, #5865F2)' },
        hoist: { type: 'BOOLEAN', description: 'Hiển thị tách biệt trên danh sách thành viên hay không' },
        mentionable: { type: 'BOOLEAN', description: 'Cho phép mọi người tag role này hay không' }
      },
      required: ['name']
    }
  },
  {
    name: 'modifyRole',
    description: 'Chỉnh sửa Role (tên, màu sắc, hoist, mentionable)',
    parameters: {
      type: 'OBJECT',
      properties: {
        roleId: { type: 'STRING', description: 'ID của role' },
        name: { type: 'STRING', description: 'Tên mới' },
        color: { type: 'STRING', description: 'Màu mới' },
        hoist: { type: 'BOOLEAN', description: 'Bật/tắt hiển thị riêng' },
        mentionable: { type: 'BOOLEAN', description: 'Bật/tắt cho phép tag' }
      },
      required: ['roleId']
    }
  },
  {
    name: 'softDeleteRole',
    description: 'Xóa mềm Role (sao lưu toàn bộ người sở hữu vào Database rồi ẩn/vô hiệu hóa, khôi phục được khi Rollback)',
    parameters: {
      type: 'OBJECT',
      properties: {
        roleId: { type: 'STRING', description: 'ID role cần xóa mềm' },
        reason: { type: 'STRING', description: 'Lý do xóa' }
      },
      required: ['roleId']
    }
  },
  {
    name: 'assignOrRemoveRole',
    description: 'Cấp hoặc Gỡ Role cho một hoặc nhiều thành viên',
    parameters: {
      type: 'OBJECT',
      properties: {
        roleId: { type: 'STRING', description: 'ID của role' },
        userIds: { 
          type: 'ARRAY', 
          items: { type: 'STRING' },
          description: 'Danh sách ID thành viên cần cấp hoặc gỡ' 
        },
        action: { type: 'STRING', enum: ['add', 'remove'] },
        reason: { type: 'STRING', description: 'Lý do' }
      },
      required: ['roleId', 'userIds', 'action']
    }
  },
  {
    name: 'setChannelPermissionOverwrites',
    description: 'Phân quyền chi tiết cho Role hoặc User trên Kênh/Category (Cấm can thiệp kênh Admin & Log)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID của Kênh hoặc Category (hoặc $STEP_N.id)' },
        targetId: { type: 'STRING', description: 'ID của Role hoặc User được cấu hình quyền' },
        targetType: { type: 'STRING', enum: ['role', 'member'] },
        allow: { 
          type: 'ARRAY', 
          items: { type: 'STRING' },
          description: 'Danh sách các quyền cho phép: ViewChannel, SendMessages, AddReactions, AttachFiles, ReadMessageHistory, Connect, Speak' 
        },
        deny: { 
          type: 'ARRAY', 
          items: { type: 'STRING' },
          description: 'Danh sách các quyền ngăn chặn: ViewChannel, SendMessages, AddReactions, AttachFiles, ReadMessageHistory, Connect, Speak' 
        }
      },
      required: ['channelId', 'targetId']
    }
  },

  // --- QUẢN TRỊ THÀNH VIÊN & VOICE ---
  {
    name: 'quarantineMember',
    description: 'Đưa thành viên vào diện Cách Ly (tạm gỡ hết role cũ, gắn role Cách Ly, phục hồi 100% khi Rollback)',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên' },
        reason: { type: 'STRING', description: 'Lý do cách ly' }
      },
      required: ['userId']
    }
  },
  {
    name: 'timeoutMember',
    description: 'Cấm chat (Timeout/Mute) thành viên theo thời gian (phút)',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên' },
        durationMinutes: { type: 'INTEGER', description: 'Thời gian cấm tính bằng phút' },
        reason: { type: 'STRING', description: 'Lý do cấm' }
      },
      required: ['userId', 'durationMinutes']
    }
  },
  {
    name: 'untimeoutMember',
    description: 'Gỡ cấm chat (Timeout) cho thành viên',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên' },
        reason: { type: 'STRING', description: 'Lý do gỡ' }
      },
      required: ['userId']
    }
  },
  {
    name: 'kickOrBanMember',
    description: 'Kick hoặc Ban thành viên khỏi server',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên' },
        action: { type: 'STRING', enum: ['kick', 'ban'] },
        reason: { type: 'STRING', description: 'Lý do xử phạt' },
        deleteMessageSeconds: { type: 'INTEGER', description: 'Số giây lịch sử tin nhắn cần xóa (0 - 604800)' }
      },
      required: ['userId', 'action']
    }
  },
  {
    name: 'unbanMember',
    description: 'Gỡ cấm (Unban) thành viên bằng User ID',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID người dùng cần gỡ ban' },
        reason: { type: 'STRING', description: 'Lý do gỡ' }
      },
      required: ['userId']
    }
  },
  {
    name: 'manageWarnings',
    description: 'Thêm, xem hoặc xóa cảnh cáo (Warnings) của thành viên',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên' },
        action: { type: 'STRING', enum: ['add', 'list', 'clear'] },
        reason: { type: 'STRING', description: 'Lý do cảnh cáo khi thêm' }
      },
      required: ['userId', 'action']
    }
  },
  {
    name: 'manageNicknames',
    description: 'Đổi biệt danh cho 1 thành viên hoặc gắn prefix hàng loạt theo Role',
    parameters: {
      type: 'OBJECT',
      properties: {
        userId: { type: 'STRING', description: 'ID thành viên (nếu đổi 1 người)' },
        nickname: { type: 'STRING', description: 'Biệt danh mới' },
        roleId: { type: 'STRING', description: 'ID role (nếu gắn prefix hàng loạt)' },
        prefix: { type: 'STRING', description: 'Tiền tố cần gắn trước tên' }
      }
    }
  },
  {
    name: 'voiceModeration',
    description: 'Điều phối phòng Voice (mute, deafen, disconnect, kéo phòng hoặc kéo toàn bộ người từ phòng A sang B)',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { 
          type: 'STRING', 
          enum: ['serverMute', 'serverUnmute', 'serverDeafen', 'serverUndeafen', 'disconnect', 'move', 'massMove']
        },
        userId: { type: 'STRING', description: 'ID thành viên (khi chỉnh cá nhân)' },
        targetChannelId: { type: 'STRING', description: 'ID phòng Voice đích' },
        sourceChannelId: { type: 'STRING', description: 'ID phòng Voice nguồn (khi massMove)' }
      },
      required: ['action']
    }
  },
  {
    name: 'inspectPruneCount',
    description: 'Kiểm tra số lượng thành viên không hoạt động (Inactive) trong N ngày (Read-Only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'INTEGER', description: 'Số ngày không hoạt động (mặc định 7)' }
      }
    }
  },

  // --- TIN NHẮN & THÔNG BÁO ---
  {
    name: 'smartPurgeMessages',
    description: 'Xóa tin nhắn thông minh có bộ lọc (Tự động sao lưu Transcript vào kênh Log trước khi xóa)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh văn bản' },
        amount: { type: 'INTEGER', description: 'Số lượng tin nhắn cần xóa (1 - 100)' },
        userId: { type: 'STRING', description: 'Chỉ xóa tin nhắn của User này' },
        botsOnly: { type: 'BOOLEAN', description: 'Chỉ xóa tin nhắn của Bot' },
        hasAttachments: { type: 'BOOLEAN', description: 'Chỉ xóa tin nhắn có chứa ảnh/file' },
        containsWord: { type: 'STRING', description: 'Chỉ xóa tin nhắn chứa từ khóa này' }
      },
      required: ['channelId', 'amount']
    }
  },
  {
    name: 'sendOrEditEmbedAnnouncement',
    description: 'Soạn và gửi thông báo dưới dạng Embed sang trọng hoặc chỉnh sửa Embed cũ',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh gửi thông báo' },
        messageId: { type: 'STRING', description: 'ID tin nhắn nếu muốn chỉnh sửa Embed cũ' },
        title: { type: 'STRING', description: 'Tiêu đề thông báo' },
        description: { type: 'STRING', description: 'Nội dung chi tiết' },
        color: { type: 'STRING', description: 'Mã màu HEX (vd: #5865F2, #2ECC71)' },
        footer: { type: 'STRING', description: 'Chữ chân trang' },
        pingRole: { type: 'STRING', description: 'ID role cần tag thông báo (nếu có)' }
      },
      required: ['channelId', 'description']
    }
  },
  {
    name: 'createPoll',
    description: 'Tạo bảng bình chọn (Poll) chính thức trên Discord',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh đăng Poll' },
        question: { type: 'STRING', description: 'Câu hỏi bình chọn' },
        answers: { 
          type: 'ARRAY', 
          items: { type: 'STRING' },
          description: 'Danh sách các lựa chọn để vote (ít nhất 2 lựa chọn)' 
        },
        durationHours: { type: 'INTEGER', description: 'Thời gian mở bình chọn tính bằng giờ (1 - 168)' }
      },
      required: ['channelId', 'question', 'answers']
    }
  },
  {
    name: 'summarizeChannelConversation',
    description: 'Đọc N tin nhắn gần nhất trong một kênh và tóm tắt nội dung hội thoại cho Admin (Read-Only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        channelId: { type: 'STRING', description: 'ID kênh cần đọc' },
        limit: { type: 'INTEGER', description: 'Số lượng tin nhắn đọc (10 - 50)' }
      },
      required: ['channelId']
    }
  },

  // --- CÀI ĐẶT SERVER & AUDIT LOG ---
  {
    name: 'modifyGuildSettings',
    description: 'Chỉnh sửa cài đặt Server (đổi tên, kênh chào mừng, kênh log)',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Tên mới của server' },
        welcomeChannelId: { type: 'STRING', description: 'ID kênh chào mừng thành viên' },
        logChannelId: { type: 'STRING', description: 'ID kênh ghi log hệ thống' }
      }
    }
  },
  {
    name: 'queryAuditLogs',
    description: 'Truy vấn lịch sử Audit Log để điều tra các hành động quản trị gần nhất (ai xóa gì, ai sửa gì) (Read-Only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Số lượng hành động cần xem (1 - 25)' }
      }
    }
  },
  {
    name: 'auditServerPermissions',
    description: 'Quét toàn bộ server để phát hiện các kênh và Role đang bị hở quyền bảo mật (Read-Only)',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'rollbackTransaction',
    description: 'Hoàn tác 100% một phiên giao dịch trước đó theo mã Transaction ID',
    parameters: {
      type: 'OBJECT',
      properties: {
        transactionId: { type: 'STRING', description: 'Mã phiên giao dịch (vd: TX-...)' }
      },
      required: ['transactionId']
    }
  }
];

// 2. Bảng ánh xạ Tool Handler sang hàm thực thi
const TOOL_HANDLERS = {
  // Channel
  createChannel: channelTools.createChannel,
  modifyChannel: channelTools.modifyChannel,
  moveAndReorderChannels: channelTools.moveAndReorderChannels,
  cloneChannel: channelTools.cloneChannel,
  softDeleteChannel: channelTools.softDeleteChannel,
  restoreDeletedChannel: channelTools.restoreDeletedChannel,
  emptyTrashCategory: channelTools.emptyTrashCategory,
  lockOrUnlockChannels: channelTools.lockOrUnlockChannels,
  manageThreads: channelTools.manageThreads,
  manageWebhooks: channelTools.manageWebhooks,

  // Role
  createRole: roleTools.createRole,
  modifyRole: roleTools.modifyRole,
  reorderRoleHierarchy: roleTools.reorderRoleHierarchy,
  softDeleteRole: roleTools.softDeleteRole,
  restoreRole: roleTools.restoreRole,
  assignOrRemoveRole: roleTools.assignOrRemoveRole,
  setChannelPermissionOverwrites: roleTools.setChannelPermissionOverwrites,

  // Member
  quarantineMember: memberTools.quarantineMember,
  unquarantineMember: memberTools.unquarantineMember,
  timeoutMember: memberTools.timeoutMember,
  untimeoutMember: memberTools.untimeoutMember,
  kickOrBanMember: memberTools.kickOrBanMember,
  unbanMember: memberTools.unbanMember,
  manageWarnings: memberTools.manageWarnings,
  manageNicknames: memberTools.manageNicknames,
  voiceModeration: memberTools.voiceModeration,
  inspectPruneCount: memberTools.inspectPruneCount,

  // Message
  smartPurgeMessages: messageTools.smartPurgeMessages,
  sendOrEditEmbedAnnouncement: messageTools.sendOrEditEmbedAnnouncement,
  createPoll: messageTools.createPoll,
  managePinsAndReactions: messageTools.managePinsAndReactions,
  summarizeChannelConversation: messageTools.summarizeChannelConversation,

  // Asset & Settings
  modifyGuildSettings: guildAssetTools.modifyGuildSettings,
  manageEmojisAndStickers: guildAssetTools.manageEmojisAndStickers,
  manageSoundboard: guildAssetTools.manageSoundboard,
  manageInvites: guildAssetTools.manageInvites,
  manageScheduledEvents: guildAssetTools.manageScheduledEvents,

  // Security & Audit
  queryAuditLogs: securityAuditTools.queryAuditLogs,
  auditServerPermissions: securityAuditTools.auditServerPermissions,
  configureDiscordAutoMod: securityAuditTools.configureDiscordAutoMod,
  configureAntiRaidAndSpam: securityAuditTools.configureAntiRaidAndSpam,
  rollbackTransaction: securityAuditTools.rollbackTransaction
};

/**
 * Thực thi một công cụ theo tên và tham số
 */
async function executeTool(guild, toolName, args) {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    throw new Error(`Công cụ '${toolName}' không tồn tại trong hệ thống Quản gia AI.`);
  }
  return await handler(guild, args);
}

module.exports = {
  functionDeclarations,
  TOOL_HANDLERS,
  executeTool
};
