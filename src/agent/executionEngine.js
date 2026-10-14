// src/agent/executionEngine.js
// Động cơ thực thi chuỗi lệnh tuần tự với Dynamic Reference ($STEP_N.id), Kill Switch & Snapshot

const { executeTool } = require('./tools');
const { saveActionSnapshot, updateActionSnapshotStatus } = require('../database/storageAdapter');
const { sleep } = require('../utils/rateLimiter');

// Bản đồ cờ ngắt Kill Switch cho từng transaction
const activeKillSwitches = new Map();
// Khóa đồng bộ theo Guild: Chống Race Condition nhiều tiến trình thực thi/hoàn tác cùng lúc
const activeGuildMutex = new Set();

/**
 * Kích hoạt Kill Switch dừng khẩn cấp cho một giao dịch đang chạy
 */
function triggerKillSwitch(transactionId) {
  activeKillSwitches.set(transactionId, true);
  console.warn(`🛑 [KILL SWITCH] Đã nhận tín hiệu DỪNG KHẨN CẤP cho Transaction: ${transactionId}`);
}

/**
 * Phân giải các ID Động (Dynamic References) giữa các bước
 * Hỗ trợ cú pháp: $STEP_1.id, $STEP_1.channel.id hoặc tự động ánh xạ theo tên đối tượng vừa tạo
 */
function resolveDynamicArgs(args, stepResults, createdEntities) {
  if (!args || typeof args !== 'object') return args;

  const resolved = Array.isArray(args) ? [...args] : { ...args };

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') {
      // 1. Phân giải cú pháp $STEP_1.id hoặc $STEP_N.channel.id
      const match = value.match(/^\$STEP_(\d+)\.([a-zA-Z0-9_.]+)$/);
      if (match) {
        const stepNum = parseInt(match[1], 10);
        const path = match[2];
        const stepRes = stepResults[stepNum];

        if (stepRes) {
          // Trích xuất thuộc tính lồng nhau
          const parts = path.split('.');
          let val = stepRes;
          for (const p of parts) {
            if (val && val[p] !== undefined) val = val[p];
            else if (val && val.channel && val.channel[p] !== undefined) val = val.channel[p];
            else if (val && val.role && val.role[p] !== undefined) val = val.role[p];
            else val = null;
          }
          if (val) resolved[key] = val;
        }
      } 
      // 2. Tự động ánh xạ parentId nếu Admin truyền tên Category vừa tạo ở bước trước
      else if (key === 'parentId' && createdEntities[value]) {
        resolved[key] = createdEntities[value].id;
      }
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveDynamicArgs(value, stepResults, createdEntities);
    }
  }

  return resolved;
}

/**
 * Thực thi một kế hoạch hành động hoàn chỉnh
 * @param {import('discord.js').Guild} guild 
 * @param {object} plan 
 * @param {string} adminId 
 * @param {Function} onProgressCallback - Cập nhật tiến độ Embed
 */
async function executePlan(guild, plan, adminId, onProgressCallback) {
  // Chống Race Condition giữa các tiến trình chạy trên cùng 1 server
  if (activeGuildMutex.has(guild.id)) {
    throw new Error('Máy chủ đang có một tiến trình Quản gia AI (Thực thi hoặc Hoàn tác) đang chạy. Vui lòng chờ phiên hiện tại hoàn tất!');
  }
  activeGuildMutex.add(guild.id);

  const transactionId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  activeKillSwitches.set(transactionId, false);

  const snapshot = {
    transactionId,
    guildId: guild.id,
    adminId,
    prompt: plan.prompt || 'Thực thi bởi Quản gia AI',
    riskLevel: plan.riskLevel || 'LOW',
    status: 'IN_PROGRESS',
    createdAt: new Date(),
    actions: []
  };

  await saveActionSnapshot(snapshot);

  const stepResults = {};
  const createdEntities = {}; // Lưu tên -> đối tượng vừa tạo để map linh hoạt
  const totalSteps = plan.actions.length;

  try {
    for (let i = 0; i < totalSteps; i++) {
      const stepNum = i + 1;
      const action = plan.actions[i];

      // 1. Kiểm tra Kill Switch
      if (activeKillSwitches.get(transactionId) === true) {
        console.warn(`🛑 [KILL SWITCH KÍCH HOẠT] Dừng ngay trước bước ${stepNum}/${totalSteps}`);
        await updateActionSnapshotStatus(transactionId, 'ABORTED');
        
        // Tự động Rollback các bước vừa chạy dở
        const rollbackEngine = require('./rollbackEngine');
        await rollbackEngine.rollback(guild, transactionId);

        return {
          success: false,
          aborted: true,
          transactionId,
          message: `Đã dừng khẩn cấp tại bước ${stepNum}/${totalSteps} và tự động hoàn tác các bước trước đó an toàn 100%!`
        };
      }

      // Cập nhật tiến độ
      if (typeof onProgressCallback === 'function') {
        await onProgressCallback(stepNum, totalSteps, action.toolName);
      }

      // 2. Phân giải Dynamic Arguments ($STEP_N.id)
      const resolvedArgs = resolveDynamicArgs(action.args, stepResults, createdEntities);

      // 3. Thực thi tool
      const result = await executeTool(guild, action.toolName, resolvedArgs);
      stepResults[stepNum] = result;

      // Lưu lại đối tượng vừa tạo để hỗ trợ các bước sau
      if (result.channel) createdEntities[result.channel.name] = result.channel;
      if (result.role) createdEntities[result.role.name] = result.role;

      const createdId = (result && result.afterState && result.afterState.createdId) || 
                        (result && result.channel && result.channel.id) || 
                        (result && result.role && result.role.id) || null;

      // 4. Lưu vết hành động vào Snapshot
      snapshot.actions.push({
        stepIndex: stepNum,
        toolName: action.toolName,
        targetType: action.toolName.toLowerCase().includes('role') ? 'ROLE' :
                    action.toolName.toLowerCase().includes('member') || action.toolName.toLowerCase().includes('warn') ? 'MEMBER' : 'CHANNEL',
        targetId: createdId || resolvedArgs.channelId || resolvedArgs.roleId || resolvedArgs.userId || null,
        beforeState: result.beforeState || null,
        afterState: result.afterState || (createdId ? { createdId } : null),
        reversible: true
      });

      // Điều tiết tốc độ gọi API Discord chống 429
      await sleep(350);
    }

    // Hoàn tất 100%
    await updateActionSnapshotStatus(transactionId, 'COMPLETED', { actions: snapshot.actions });
    activeKillSwitches.delete(transactionId);

    return {
      success: true,
      transactionId,
      totalSteps,
      stepResults
    };
  } catch (err) {
    console.error(`❌ [LỖI THỰC THI] Transaction ${transactionId}:`, err.message);
    await updateActionSnapshotStatus(transactionId, 'FAILED', { actions: snapshot.actions });
    activeKillSwitches.delete(transactionId);
    throw err;
  } finally {
    activeGuildMutex.delete(guild.id);
  }
}

module.exports = {
  executePlan,
  triggerKillSwitch,
  activeGuildMutex
};
