// src/agent/tools/channelTools.js
// Nghiệp vụ Kênh, Danh mục, Voice, Stage, Forum, Thread & Webhook (Có Soft-Delete)

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { assertNotProtected } = require('../../config/ids');

const TRASH_CATEGORY_NAME = '🗄️-THÙNG-RÁC';

/**
 * Tìm hoặc tự động tạo Category Thùng Rác ẩn để phục vụ Soft-Delete
 */
async function getOrCreateTrashCategory(guild) {
  let trashCat = guild.channels.cache.find(
    ch => ch.type === ChannelType.GuildCategory && ch.name === TRASH_CATEGORY_NAME
  );

  if (!trashCat) {
    trashCat = await guild.channels.create({
      name: TRASH_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
  }

  return trashCat;
}

// 1. Tạo Kênh hoặc Category mới
async function createChannel(guild, args) {
  const { name, type = 'text', parentId, topic, nsfw = false, slowmode = 0, bitrate, userLimit } = args;

  let channelType = ChannelType.GuildText;
  if (type === 'category') channelType = ChannelType.GuildCategory;
  else if (type === 'voice') channelType = ChannelType.GuildVoice;
  else if (type === 'announcement') channelType = ChannelType.GuildAnnouncement;
  else if (type === 'stage') channelType = ChannelType.GuildStageVoice;
  else if (type === 'forum') channelType = ChannelType.GuildForum;

  const createOptions = {
    name,
    type: channelType,
    parent: parentId || null
  };

  if (channelType === ChannelType.GuildText || channelType === ChannelType.GuildAnnouncement) {
    if (topic) createOptions.topic = topic;
    createOptions.nsfw = Boolean(nsfw);
    if (slowmode) createOptions.rateLimitPerUser = Number(slowmode);
  }

  if (channelType === ChannelType.GuildVoice) {
    if (bitrate) createOptions.bitrate = Number(bitrate);
    if (userLimit) createOptions.userLimit = Number(userLimit);
  }

  const created = await guild.channels.create(createOptions);

  return {
    success: true,
    action: 'CREATE_CHANNEL',
    channel: {
      id: created.id,
      name: created.name,
      type: type,
      parentId: created.parentId
    }
  };
}

// 2. Chỉnh sửa Kênh
async function modifyChannel(guild, args) {
  const { channelId, name, topic, parentId, slowmode, nsfw, userLimit } = args;
  assertNotProtected(channelId, name || 'kênh');

  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh có ID: ${channelId}`);

  const beforeState = {
    name: channel.name,
    topic: channel.topic,
    parentId: channel.parentId,
    rateLimitPerUser: channel.rateLimitPerUser,
    nsfw: channel.nsfw,
    userLimit: channel.userLimit
  };

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (topic !== undefined) updates.topic = topic;
  if (parentId !== undefined) updates.parent = parentId;
  if (slowmode !== undefined) updates.rateLimitPerUser = Number(slowmode);
  if (nsfw !== undefined) updates.nsfw = Boolean(nsfw);
  if (userLimit !== undefined) updates.userLimit = Number(userLimit);

  const updated = await channel.edit(updates);

  return {
    success: true,
    action: 'MODIFY_CHANNEL',
    channelId: updated.id,
    beforeState,
    afterState: {
      name: updated.name,
      topic: updated.topic,
      parentId: updated.parentId,
      rateLimitPerUser: updated.rateLimitPerUser
    }
  };
}

// 3. Di chuyển và sắp xếp kênh
async function moveAndReorderChannels(guild, args) {
  const { channelId, parentId, position } = args;
  assertNotProtected(channelId, 'kênh');

  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh có ID: ${channelId}`);

  const beforeState = {
    parentId: channel.parentId,
    position: channel.position
  };

  const updates = {};
  if (parentId !== undefined) updates.parent = parentId;
  if (position !== undefined) updates.position = Number(position);

  const updated = await channel.edit(updates);

  return {
    success: true,
    action: 'MOVE_CHANNEL',
    channelId: updated.id,
    beforeState,
    afterState: { parentId: updated.parentId, position: updated.position }
  };
}

// 4. Nhân bản kênh (Clone)
async function cloneChannel(guild, args) {
  const { channelId, newName } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh gốc có ID: ${channelId}`);

  const cloned = await channel.clone({ name: newName || `${channel.name}-copy` });

  return {
    success: true,
    action: 'CLONE_CHANNEL',
    clonedChannel: { id: cloned.id, name: cloned.name, parentId: cloned.parentId }
  };
}

// 5. Xóa mềm Kênh (Soft Delete - Chuyển vào Thùng Rác, không mất tin nhắn)
async function softDeleteChannel(guild, args) {
  const { channelId, reason = 'Chuyển vào thùng rác' } = args;
  assertNotProtected(channelId, 'kênh xóa');

  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh có ID: ${channelId}`);

  // Lưu trạng thái trước khi xóa mềm
  const beforeState = {
    originalName: channel.name,
    originalParentId: channel.parentId,
    originalPosition: channel.position,
    permissionOverwrites: channel.permissionOverwrites.cache.map(po => ({
      id: po.id,
      type: po.type,
      allow: po.allow.toArray(),
      deny: po.deny.toArray()
    }))
  };

  const trashCat = await getOrCreateTrashCategory(guild);

  // Đổi tên và chuyển vào category thùng rác ẩn
  const updated = await channel.edit({
    name: `deleted-${channel.name}`.slice(0, 32),
    parent: trashCat.id,
    lockPermissions: true
  });

  return {
    success: true,
    action: 'SOFT_DELETE_CHANNEL',
    channelId: updated.id,
    beforeState,
    afterState: { name: updated.name, parentId: updated.parentId, reason }
  };
}

// 6. Khôi phục Kênh từ Thùng Rác (Restore)
async function restoreDeletedChannel(guild, args) {
  const { channelId, originalName, originalParentId, originalPosition, permissionOverwrites } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh trong thùng rác: ${channelId}`);

  const updates = {
    name: originalName || channel.name.replace(/^deleted-/, ''),
    parent: originalParentId || null
  };
  if (originalPosition !== undefined) updates.position = originalPosition;

  const restored = await channel.edit(updates);

  // Khôi phục lại quyền nếu có
  if (Array.isArray(permissionOverwrites) && permissionOverwrites.length > 0) {
    await restored.permissionOverwrites.set(permissionOverwrites).catch(() => {});
  }

  return {
    success: true,
    action: 'RESTORE_CHANNEL',
    channelId: restored.id,
    name: restored.name,
    parentId: restored.parentId
  };
}

// 7. Khóa hoặc Mở khóa Kênh nhanh
async function lockOrUnlockChannels(guild, args) {
  const { channelId, lock = true, reason = 'Khóa/mở khóa kênh' } = args;
  assertNotProtected(channelId, 'kênh');

  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  const everyoneRole = guild.roles.everyone;
  const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);

  const beforeState = {
    deny: currentOverwrites ? currentOverwrites.deny.toArray() : [],
    allow: currentOverwrites ? currentOverwrites.allow.toArray() : []
  };

  await channel.permissionOverwrites.edit(everyoneRole, {
    SendMessages: lock ? false : null,
    AddReactions: lock ? false : null,
    Connect: lock ? false : null
  }, { reason });

  return {
    success: true,
    action: lock ? 'LOCK_CHANNEL' : 'UNLOCK_CHANNEL',
    channelId: channel.id,
    beforeState,
    afterState: { locked: lock, reason }
  };
}

// 8. Quản lý Threads
async function manageThreads(guild, args) {
  const { channelId, threadId, action, name, autoArchiveDuration = 1440, locked = false } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  if (action === 'create') {
    const thread = await channel.threads.create({
      name: name || 'Thảo luận mới',
      autoArchiveDuration: Number(autoArchiveDuration)
    });
    return { success: true, action: 'CREATE_THREAD', threadId: thread.id, name: thread.name };
  }

  if (action === 'archive' || action === 'lock' || action === 'unarchive') {
    const thread = await channel.threads.fetch(threadId);
    if (!thread) throw new Error(`Không tìm thấy Thread: ${threadId}`);
    if (action === 'archive') await thread.setArchived(true);
    if (action === 'unarchive') await thread.setArchived(false);
    if (action === 'lock') await thread.setLocked(Boolean(locked));
    return { success: true, action: `THREAD_${action.toUpperCase()}`, threadId: thread.id };
  }

  throw new Error(`Hành động Thread không hỗ trợ: ${action}`);
}

// 9. Quản lý Webhooks
async function manageWebhooks(guild, args) {
  const { channelId, action = 'list', name = 'Bot-Webhook', webhookId } = args;
  const channel = await guild.channels.fetch(channelId);
  if (!channel) throw new Error(`Không tìm thấy kênh: ${channelId}`);

  if (action === 'create') {
    const hook = await channel.createWebhook({ name });
    return { success: true, action: 'CREATE_WEBHOOK', webhook: { id: hook.id, name: hook.name, url: hook.url } };
  }

  if (action === 'delete') {
    const hooks = await channel.fetchWebhooks();
    const target = hooks.get(webhookId);
    if (!target) throw new Error(`Không tìm thấy Webhook ID: ${webhookId}`);
    await target.delete();
    return { success: true, action: 'DELETE_WEBHOOK', webhookId };
  }

  const hooks = await channel.fetchWebhooks();
  return {
    success: true,
    action: 'LIST_WEBHOOKS',
    webhooks: hooks.map(h => ({ id: h.id, name: h.name, channelId: h.channelId }))
  };
}

module.exports = {
  createChannel,
  modifyChannel,
  moveAndReorderChannels,
  cloneChannel,
  softDeleteChannel,
  restoreDeletedChannel,
  lockOrUnlockChannels,
  manageThreads,
  manageWebhooks
};
