// src/agent/tools/roleTools.js
// Nghiệp vụ Vai trò (Role), Phân cấp Hierarchy & Phân quyền Chi tiết (Chặn cấp quyền Admin)

const { PermissionsBitField } = require('discord.js');
const { assertNotProtected } = require('../../config/ids');
const { sleep } = require('../../utils/rateLimiter');

/**
 * Kiểm tra xem danh sách quyền có chứa quyền Administrator hay không
 */
function assertNoAdminPermission(permissions = []) {
  if (!Array.isArray(permissions)) return;
  const hasAdmin = permissions.some(p => 
    p === 'Administrator' || p === 'ADMINISTRATOR' || p === PermissionsBitField.Flags.Administrator
  );
  if (hasAdmin) {
    throw new Error('🚫 [BẢO MẬT TỐI CAO] Quản gia AI không được phép tạo hoặc cấp quyền Administrator (Quản trị viên) cho bất kỳ Vai trò nào!');
  }
}

// 1. Tạo Role mới (Lưu createdId và cấm quyền Admin)
async function createRole(guild, args) {
  const { name, color, hoist = false, mentionable = false, permissions = [] } = args;

  // Chặn leo thang đặc quyền ngầm
  assertNoAdminPermission(permissions);

  const role = await guild.roles.create({
    name,
    color: color || '#99AAB5',
    hoist: Boolean(hoist),
    mentionable: Boolean(mentionable),
    permissions: Array.isArray(permissions) ? permissions : []
  });

  return {
    success: true,
    action: 'CREATE_ROLE',
    createdId: role.id,
    targetId: role.id,
    role: { id: role.id, name: role.name, color: role.hexColor, position: role.position },
    beforeState: null,
    afterState: {
      createdId: role.id,
      name: role.name,
      color: role.hexColor
    }
  };
}

// 2. Chỉnh sửa Role (Cấm quyền Admin)
async function modifyRole(guild, args) {
  const { roleId, name, color, hoist, mentionable, permissions } = args;
  assertNotProtected(roleId, name || 'role');

  if (permissions) {
    assertNoAdminPermission(permissions);
  }

  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error(`Không tìm thấy Role có ID: ${roleId}`);

  const beforeState = {
    name: role.name,
    color: role.hexColor,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.toArray()
  };

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (hoist !== undefined) updates.hoist = Boolean(hoist);
  if (mentionable !== undefined) updates.mentionable = Boolean(mentionable);
  if (permissions !== undefined) updates.permissions = permissions;

  const updated = await role.edit(updates);

  return {
    success: true,
    action: 'MODIFY_ROLE',
    roleId: updated.id,
    targetId: updated.id,
    beforeState,
    afterState: { name: updated.name, color: updated.hexColor }
  };
}

// 3. Sắp xếp thứ tự phân cấp Role (Hierarchy)
async function reorderRoleHierarchy(guild, args) {
  const { roleId, position } = args;
  assertNotProtected(roleId, 'role');

  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error(`Không tìm thấy Role có ID: ${roleId}`);

  const beforePosition = role.position;
  await role.setPosition(Number(position));

  return {
    success: true,
    action: 'REORDER_ROLE',
    roleId: role.id,
    targetId: role.id,
    beforeState: { position: beforePosition },
    afterState: { position: Number(position) }
  };
}

// 4. Xóa mềm Role (Soft Delete - Sao lưu danh sách thành viên trước khi ẩn)
async function softDeleteRole(guild, args) {
  const { roleId, reason = 'Xóa mềm vai trò' } = args;
  assertNotProtected(roleId, 'role xóa');

  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error(`Không tìm thấy Role có ID: ${roleId}`);

  const membersWithRole = role.members.map(m => m.id);

  const beforeState = {
    name: role.name,
    color: role.hexColor,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.toArray(),
    memberIds: membersWithRole
  };

  await role.edit({
    name: `[Đã ẩn] ${role.name}`.slice(0, 32),
    permissions: [],
    hoist: false,
    mentionable: false
  }, reason);

  return {
    success: true,
    action: 'SOFT_DELETE_ROLE',
    roleId: role.id,
    targetId: role.id,
    beforeState,
    afterState: { hidden: true, membersBackedUp: membersWithRole.length }
  };
}

// 5. Khôi phục Role đã xóa mềm
async function restoreRole(guild, args) {
  const { roleId, name, color, hoist, mentionable, permissions, memberIds = [] } = args;
  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error(`Không tìm thấy Role: ${roleId}`);

  await role.edit({
    name: name || role.name.replace(/^\[Đã ẩn\]\s*/, ''),
    color: color || role.hexColor,
    hoist: Boolean(hoist),
    mentionable: Boolean(mentionable),
    permissions: Array.isArray(permissions) ? permissions : []
  });

  let restoredCount = 0;
  for (const mId of memberIds) {
    try {
      const member = await guild.members.fetch(mId).catch(() => null);
      if (member) {
        await member.roles.add(role.id);
        restoredCount++;
        await sleep(250);
      }
    } catch {}
  }

  return {
    success: true,
    action: 'RESTORE_ROLE',
    roleId: role.id,
    targetId: role.id,
    membersRestored: restoredCount
  };
}

// 6. Cấp hoặc Gỡ Role cho thành viên
async function assignOrRemoveRole(guild, args) {
  const { roleId, userIds = [], action = 'add', reason = 'Quản gia AI điều phối role' } = args;
  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error(`Không tìm thấy Role: ${roleId}`);

  const beforeState = [];
  const processed = [];

  for (const uId of userIds) {
    try {
      const member = await guild.members.fetch(uId).catch(() => null);
      if (member) {
        const hasRole = member.roles.cache.has(role.id);
        beforeState.push({ userId: uId, hadRole: hasRole });

        if (action === 'add' && !hasRole) {
          await member.roles.add(role, reason);
          processed.push(uId);
        } else if (action === 'remove' && hasRole) {
          await member.roles.remove(role, reason);
          processed.push(uId);
        }
        await sleep(300);
      }
    } catch (err) {
      console.warn(`Lỗi khi gán role cho user ${uId}:`, err.message);
    }
  }

  return {
    success: true,
    action: action === 'add' ? 'ASSIGN_ROLE' : 'REMOVE_ROLE',
    roleId: role.id,
    targetId: role.id,
    roleName: role.name,
    targetCount: processed.length,
    beforeState
  };
}

// 7. Thiết lập Quyền Chi Tiết trên Kênh (Cấm tuyệt đối kênh Admin & Log)
async function setChannelPermissionOverwrites(guild, args) {
  const { channelId, targetId, targetType = 'role', allow = [], deny = [] } = args;
  assertNotProtected(channelId, 'kênh phân quyền');

  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  const existing = channel.permissionOverwrites.cache.get(targetId);
  const beforeState = {
    targetId,
    allow: existing ? existing.allow.toArray() : [],
    deny: existing ? existing.deny.toArray() : []
  };

  const allowObj = {};
  allow.forEach(p => { allowObj[p] = true; });

  const denyObj = {};
  deny.forEach(p => { denyObj[p] = false; });

  await channel.permissionOverwrites.edit(targetId, {
    ...allowObj,
    ...denyObj
  });

  return {
    success: true,
    action: 'SET_CHANNEL_PERMISSIONS',
    channelId: channel.id,
    targetId: channel.id,
    overwrittenTargetId: targetId,
    targetType,
    beforeState,
    afterState: { allow, deny }
  };
}

module.exports = {
  createRole,
  modifyRole,
  reorderRoleHierarchy,
  softDeleteRole,
  restoreRole,
  assignOrRemoveRole,
  setChannelPermissionOverwrites
};
