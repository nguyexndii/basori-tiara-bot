// src/agent/rollbackEngine.js
// Động cơ Hoàn tác (Rollback Engine) 100%: Duyệt ngược ActionSnapshot và phục hồi trạng thái cũ

const { getActionSnapshot, updateActionSnapshotStatus } = require('../database/storageAdapter');
const { restoreDeletedChannel, modifyChannel } = require('./tools/channelTools');
const { restoreRole, modifyRole, setChannelPermissionOverwrites } = require('./tools/roleTools');
const { unquarantineMember, untimeoutMember } = require('./tools/memberTools');
const { sleep } = require('../utils/rateLimiter');

/**
 * Thực thi Hoàn tác (Rollback) cho một giao dịch theo transactionId
 * @param {import('discord.js').Guild} guild 
 * @param {string} transactionId 
 * @returns {Promise<object>}
 */
async function rollback(guild, transactionId) {
  const snapshot = await getActionSnapshot(transactionId);
  if (!snapshot) {
    throw new Error(`Không tìm thấy dữ liệu Snapshot cho Transaction: ${transactionId}`);
  }

  if (snapshot.status === 'ROLLED_BACK') {
    throw new Error(`Giao dịch '${transactionId}' đã được hoàn tác trước đó rồi!`);
  }

  const actions = snapshot.actions || [];
  const reversedActions = [...actions].reverse(); // Đảo ngược danh sách hành động
  let rolledBackCount = 0;

  console.log(`🔄 [BẮT ĐẦU ROLLBACK] Transaction ${transactionId} với ${reversedActions.length} bước...`);

  for (const action of reversedActions) {
    try {
      const { toolName, targetId, beforeState } = action;

      // 1. KÊNH & DANH MỤC
      if (toolName === 'createChannel') {
        // Hoàn tác tạo kênh: Xóa kênh vừa tạo
        if (targetId) {
          const ch = await guild.channels.fetch(targetId).catch(() => null);
          if (ch) await ch.delete('Rollback hành động tạo kênh');
        }
      } else if (toolName === 'softDeleteChannel') {
        // Hoàn tác xóa mềm: Đưa kênh từ Thùng Rác về lại vị trí cũ
        if (targetId && beforeState) {
          await restoreDeletedChannel(guild, {
            channelId: targetId,
            originalName: beforeState.originalName,
            originalParentId: beforeState.originalParentId,
            originalPosition: beforeState.originalPosition,
            permissionOverwrites: beforeState.permissionOverwrites
          });
        }
      } else if (toolName === 'modifyChannel' && targetId && beforeState) {
        // Hoàn tác sửa kênh: Khôi phục thuộc tính cũ
        await modifyChannel(guild, { channelId: targetId, ...beforeState });
      }

      // 2. VAI TRÒ & PHÂN QUYỀN
      else if (toolName === 'createRole') {
        // Hoàn tác tạo role: Xóa role vừa tạo
        if (targetId) {
          const role = await guild.roles.fetch(targetId).catch(() => null);
          if (role) await role.delete('Rollback hành động tạo vai trò');
        }
      } else if (toolName === 'softDeleteRole' && targetId && beforeState) {
        // Hoàn tác xóa mềm role: Phục hồi tên, quyền và gán lại cho các thành viên cũ
        await restoreRole(guild, { roleId: targetId, ...beforeState });
      } else if (toolName === 'modifyRole' && targetId && beforeState) {
        // Hoàn tác sửa role: Khôi phục cấu hình cũ
        await modifyRole(guild, { roleId: targetId, ...beforeState });
      } else if (toolName === 'setChannelPermissionOverwrites' && beforeState) {
        // Hoàn tác phân quyền: Áp lại quyền cũ
        await setChannelPermissionOverwrites(guild, {
          channelId: action.targetId,
          targetId: beforeState.targetId,
          allow: beforeState.allow,
          deny: beforeState.deny
        });
      }

      // 3. THÀNH VIÊN & KỶ LUẬT
      else if (toolName === 'quarantineMember' && beforeState) {
        // Hoàn tác cách ly: Trả lại các Role ban đầu
        await unquarantineMember(guild, {
          userId: beforeState.userId,
          oldRoleIds: beforeState.oldRoleIds
        });
      } else if (toolName === 'timeoutMember' && targetId) {
        // Hoàn tác timeout: Gỡ cấm chat
        await untimeoutMember(guild, { userId: targetId });
      } else if (toolName === 'assignOrRemoveRole' && beforeState && Array.isArray(beforeState)) {
        // Hoàn tác gán/gỡ role hàng loạt
        const role = await guild.roles.fetch(action.targetId).catch(() => null);
        if (role) {
          for (const item of beforeState) {
            try {
              const mem = await guild.members.fetch(item.userId).catch(() => null);
              if (mem) {
                if (item.hadRole) await mem.roles.add(role);
                else await mem.roles.remove(role);
              }
            } catch {}
          }
        }
      }

      rolledBackCount++;
      await sleep(300);
    } catch (err) {
      console.warn(`Lỗi khi hoàn tác bước ${action.stepIndex}:`, err.message);
    }
  }

  await updateActionSnapshotStatus(transactionId, 'ROLLED_BACK');
  console.log(`✅ [ROLLBACK THÀNH CÔNG] Đã hoàn tác ${rolledBackCount}/${reversedActions.length} bước của ${transactionId}!`);

  return {
    success: true,
    transactionId,
    totalSteps: actions.length,
    rolledBackCount,
    prompt: snapshot.prompt
  };
}

module.exports = {
  rollback
};
