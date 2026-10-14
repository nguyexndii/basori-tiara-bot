// src/agent/tools/memberTools.js
// Nghiệp vụ Quản trị Thành viên, Kỷ luật, Cách Ly (Quarantine), Biệt danh & Điều phối Voice

const { sleep } = require('../../utils/rateLimiter');
const { addWarning, getWarnings, clearWarnings } = require('../../database/storageAdapter');

const QUARANTINE_ROLE_NAME = '🚨 Cách Ly';

/**
 * Tìm hoặc tự động tạo Role Cách Ly (chỉ được xem phòng giải trình)
 */
async function getOrCreateQuarantineRole(guild) {
  let qRole = guild.roles.cache.find(r => r.name === QUARANTINE_ROLE_NAME);
  if (!qRole) {
    qRole = await guild.roles.create({
      name: QUARANTINE_ROLE_NAME,
      color: '#E74C3C',
      hoist: true,
      mentionable: false,
      permissions: []
    });
  }
  return qRole;
}

// 1. Cách Ly Thành Viên (Quarantine - Thay thế an toàn cho Kick/Ban cứng)
async function quarantineMember(guild, args) {
  const { userId, reason = 'Cách ly để điều tra' } = args;
  const member = await guild.members.fetch(userId);
  if (!member) throw new Error(`Không tìm thấy thành viên: ${userId}`);

  const oldRoles = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);
  const beforeState = { userId, oldRoleIds: oldRoles };

  const qRole = await getOrCreateQuarantineRole(guild);

  // Gỡ toàn bộ role cũ và gắn role cách ly
  await member.roles.set([qRole.id], reason);

  return {
    success: true,
    action: 'QUARANTINE_MEMBER',
    userId,
    userTag: member.user.tag,
    beforeState,
    afterState: { quarantined: true, reason }
  };
}

// 2. Gỡ Cách Ly Thành Viên (Phục hồi lại toàn bộ Role ban đầu)
async function unquarantineMember(guild, args) {
  const { userId, oldRoleIds = [] } = args;
  const member = await guild.members.fetch(userId);
  if (!member) throw new Error(`Không tìm thấy thành viên: ${userId}`);

  const qRole = await getOrCreateQuarantineRole(guild);
  await member.roles.remove(qRole.id).catch(() => {});

  if (oldRoleIds.length > 0) {
    await member.roles.set(oldRoleIds, 'Gỡ cách ly thành viên');
  }

  return {
    success: true,
    action: 'UNQUARANTINE_MEMBER',
    userId,
    userTag: member.user.tag,
    rolesRestored: oldRoleIds.length
  };
}

// 3. Timeout Thành viên
async function timeoutMember(guild, args) {
  const { userId, durationMinutes = 10, reason = 'Vi phạm quy định' } = args;
  const member = await guild.members.fetch(userId);
  if (!member) throw new Error(`Không tìm thấy thành viên: ${userId}`);

  const durationMs = Math.min(Number(durationMinutes) * 60 * 1000, 28 * 24 * 60 * 60 * 1000);
  const beforeState = {
    communicationDisabledUntil: member.communicationDisabledUntil
  };

  await member.timeout(durationMs, reason);

  return {
    success: true,
    action: 'TIMEOUT_MEMBER',
    userId,
    userTag: member.user.tag,
    durationMinutes,
    beforeState,
    afterState: { timeoutUntil: new Date(Date.now() + durationMs).toISOString(), reason }
  };
}

// 4. Gỡ Timeout
async function untimeoutMember(guild, args) {
  const { userId, reason = 'Gỡ timeout theo lệnh Quản gia' } = args;
  const member = await guild.members.fetch(userId);
  if (!member) throw new Error(`Không tìm thấy thành viên: ${userId}`);

  await member.timeout(null, reason);

  return {
    success: true,
    action: 'UNTIMEOUT_MEMBER',
    userId,
    userTag: member.user.tag
  };
}

// 5. Kick hoặc Ban Thành viên
async function kickOrBanMember(guild, args) {
  const { userId, action = 'kick', reason = 'Xử phạt bởi Quản gia', deleteMessageSeconds = 0 } = args;
  const member = await guild.members.fetch(userId).catch(() => null);

  const beforeState = {
    userId,
    userTag: member ? member.user.tag : userId,
    roles: member ? member.roles.cache.map(r => r.id) : []
  };

  if (action === 'kick') {
    if (!member) throw new Error(`Không tìm thấy thành viên để Kick: ${userId}`);
    await member.kick(reason);
  } else if (action === 'ban') {
    await guild.members.ban(userId, {
      reason,
      deleteMessageSeconds: Number(deleteMessageSeconds)
    });
  }

  return {
    success: true,
    action: action === 'kick' ? 'KICK_MEMBER' : 'BAN_MEMBER',
    userId,
    beforeState,
    afterState: { executedAction: action, reason }
  };
}

// 6. Gỡ Ban qua User ID
async function unbanMember(guild, args) {
  const { userId, reason = 'Gỡ cấm bởi Quản gia AI' } = args;
  await guild.members.unban(userId, reason);

  return {
    success: true,
    action: 'UNBAN_MEMBER',
    userId
  };
}

// 7. Quản lý Cảnh Cáo (Warnings)
async function manageWarnings(guild, args) {
  const { userId, action = 'list', reason = 'Vi phạm', moderator = 'Quản gia AI' } = args;

  if (action === 'add') {
    const res = await addWarning(guild.id, userId, reason, moderator);
    return { success: true, action: 'ADD_WARNING', userId, total: res.total, warning: res.warning };
  }
  if (action === 'clear') {
    const count = await clearWarnings(guild.id, userId);
    return { success: true, action: 'CLEAR_WARNINGS', userId, clearedCount: count };
  }

  const list = await getWarnings(guild.id, userId);
  return { success: true, action: 'LIST_WARNINGS', userId, warnings: list };
}

// 8. Quản lý Biệt Danh (Nickname)
async function manageNicknames(guild, args) {
  const { userId, nickname, prefix, roleId, reason = 'Quản lý biệt danh' } = args;

  // Nếu đổi cho 1 cá nhân
  if (userId) {
    const member = await guild.members.fetch(userId);
    if (!member) throw new Error(`Không tìm thấy thành viên: ${userId}`);
    const oldNick = member.nickname || '';
    await member.setNickname(nickname || null, reason);
    return { success: true, action: 'SET_NICKNAME', userId, beforeState: { nickname: oldNick }, afterState: { nickname } };
  }

  // Nếu gắn prefix hàng loạt theo Role
  if (roleId && prefix) {
    const role = await guild.roles.fetch(roleId);
    if (!role) throw new Error(`Không tìm thấy Role: ${roleId}`);
    let count = 0;
    for (const [, mem] of role.members) {
      try {
        const cur = mem.nickname || mem.user.username;
        if (!cur.startsWith(prefix)) {
          await mem.setNickname(`${prefix} ${cur}`.slice(0, 32), reason);
          count++;
          await sleep(350);
        }
      } catch {}
    }
    return { success: true, action: 'BATCH_PREFIX_NICKNAMES', roleId, updatedCount: count };
  }

  throw new Error('Cần cung cấp userId hoặc roleId + prefix');
}

// 9. Điều phối Voice (Mute, Deafen, Kéo phòng, Mass Move)
async function voiceModeration(guild, args) {
  const { action, userId, targetChannelId, sourceChannelId } = args;

  // Kéo toàn bộ người từ phòng Voice A sang phòng Voice B (Mass Move)
  if (action === 'massMove' && sourceChannelId && targetChannelId) {
    const srcCh = await guild.channels.fetch(sourceChannelId);
    const destCh = await guild.channels.fetch(targetChannelId);
    if (!srcCh || !destCh) throw new Error('Không tìm thấy phòng Voice nguồn hoặc đích');

    let moved = 0;
    for (const [, member] of srcCh.members) {
      try {
        await member.voice.setChannel(destCh);
        moved++;
        await sleep(200);
      } catch {}
    }
    return { success: true, action: 'MASS_MOVE_VOICE', from: srcCh.name, to: destCh.name, movedCount: moved };
  }

  // Thao tác với cá nhân
  if (userId) {
    const member = await guild.members.fetch(userId);
    if (!member || !member.voice.channel) throw new Error(`Thành viên ${userId} không ở trong phòng thoại`);

    if (action === 'serverMute') await member.voice.setMute(true);
    else if (action === 'serverUnmute') await member.voice.setMute(false);
    else if (action === 'serverDeafen') await member.voice.setDeaf(true);
    else if (action === 'serverUndeafen') await member.voice.setDeaf(false);
    else if (action === 'disconnect') await member.voice.disconnect();
    else if (action === 'move' && targetChannelId) await member.voice.setChannel(targetChannelId);

    return { success: true, action: `VOICE_${action.toUpperCase()}`, userId };
  }

  throw new Error(`Thao tác Voice không hợp lệ: ${action}`);
}

// 10. Tra cứu thành viên Inactive (Read-Only)
async function inspectPruneCount(guild, args) {
  const { days = 7 } = args;
  const count = await guild.members.prune({ days: Number(days), dryRun: true });
  return {
    success: true,
    action: 'INSPECT_PRUNE_COUNT',
    days: Number(days),
    inactiveMemberCount: count
  };
}

module.exports = {
  quarantineMember,
  unquarantineMember,
  timeoutMember,
  untimeoutMember,
  kickOrBanMember,
  unbanMember,
  manageWarnings,
  manageNicknames,
  voiceModeration,
  inspectPruneCount
};
