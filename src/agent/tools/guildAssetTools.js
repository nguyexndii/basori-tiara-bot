// src/agent/tools/guildAssetTools.js
// Nghiệp vụ Cài đặt Server, Emoji, Sticker, Soundboard, Invites & Sự kiện (Events)

const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');
const { updateSettings } = require('../../database/storageAdapter');

// 1. Chỉnh sửa Cài đặt Máy chủ & Kênh chào mừng
async function modifyGuildSettings(guild, args) {
  const { name, verificationLevel, welcomeChannelId, logChannelId } = args;

  const beforeState = {
    name: guild.name,
    verificationLevel: guild.verificationLevel
  };

  if (name) await guild.setName(name);
  if (verificationLevel !== undefined) await guild.setVerificationLevel(Number(verificationLevel));

  const dbUpdates = {};
  if (welcomeChannelId) dbUpdates.welcomeChannelId = welcomeChannelId;
  if (logChannelId) dbUpdates.logChannelId = logChannelId;

  if (Object.keys(dbUpdates).length > 0) {
    await updateSettings(guild.id, dbUpdates);
  }

  return {
    success: true,
    action: 'MODIFY_GUILD_SETTINGS',
    beforeState,
    afterState: { name: guild.name, verificationLevel: guild.verificationLevel, ...dbUpdates }
  };
}

// 2. Quản lý Emoji & Sticker
async function manageEmojisAndStickers(guild, args) {
  const { action, type = 'emoji', name, url, id } = args;

  if (type === 'emoji') {
    if (action === 'create' && name && url) {
      const emoji = await guild.emojis.create({ attachment: url, name });
      return { success: true, action: 'CREATE_EMOJI', emoji: { id: emoji.id, name: emoji.name } };
    }
    if (action === 'delete' && id) {
      const emoji = await guild.emojis.fetch(id);
      if (!emoji) throw new Error(`Không tìm thấy Emoji ID: ${id}`);
      await emoji.delete();
      return { success: true, action: 'DELETE_EMOJI', id };
    }
  }

  if (type === 'sticker') {
    if (action === 'create' && name && url) {
      const sticker = await guild.stickers.create({ file: url, name, tags: name });
      return { success: true, action: 'CREATE_STICKER', sticker: { id: sticker.id, name: sticker.name } };
    }
    if (action === 'delete' && id) {
      const sticker = await guild.stickers.fetch(id);
      if (!sticker) throw new Error(`Không tìm thấy Sticker ID: ${id}`);
      await sticker.delete();
      return { success: true, action: 'DELETE_STICKER', id };
    }
  }

  throw new Error(`Thao tác Emoji/Sticker không hợp lệ: ${action} / ${type}`);
}

// 3. Quản lý Soundboard
async function manageSoundboard(guild, args) {
  const { action = 'list', soundId } = args;
  // Discord.js soundboard fetch
  try {
    const sounds = await guild.soundboard.fetchSounds();
    if (action === 'delete' && soundId) {
      const target = sounds.get(soundId);
      if (!target) throw new Error(`Không tìm thấy âm thanh Soundboard: ${soundId}`);
      await target.delete();
      return { success: true, action: 'DELETE_SOUND', soundId };
    }
    return {
      success: true,
      action: 'LIST_SOUNDS',
      sounds: sounds.map(s => ({ id: s.id, name: s.name, volume: s.volume }))
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 4. Quản lý Link Mời (Invites)
async function manageInvites(guild, args) {
  const { action = 'list', channelId, maxAge = 0, maxUses = 0, inviteCode } = args;

  if (action === 'create' && channelId) {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) throw new Error(`Không tìm thấy kênh: ${channelId}`);
    const invite = await channel.createInvite({
      maxAge: Number(maxAge),
      maxUses: Number(maxUses),
      unique: true
    });
    return { success: true, action: 'CREATE_INVITE', code: invite.code, url: invite.url };
  }

  if (action === 'delete' && inviteCode) {
    await guild.invites.delete(inviteCode);
    return { success: true, action: 'DELETE_INVITE', inviteCode };
  }

  const invites = await guild.invites.fetch();
  return {
    success: true,
    action: 'LIST_INVITES',
    invites: invites.map(inv => ({
      code: inv.code,
      channelId: inv.channelId,
      uses: inv.uses,
      inviter: inv.inviter ? inv.inviter.tag : null
    }))
  };
}

// 5. Quản lý Sự kiện Server (Scheduled Events)
async function manageScheduledEvents(guild, args) {
  const { action = 'create', eventId, name, description, scheduledStartTime, channelId, entityType = 'voice' } = args;

  if (action === 'create') {
    const event = await guild.scheduledEvents.create({
      name,
      description: description || '',
      scheduledStartTime: new Date(scheduledStartTime || Date.now() + 3600000),
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: entityType === 'stage' ? GuildScheduledEventEntityType.StageInstance : GuildScheduledEventEntityType.Voice,
      channel: channelId
    });
    return { success: true, action: 'CREATE_EVENT', event: { id: event.id, name: event.name } };
  }

  if (action === 'delete' && eventId) {
    const event = await guild.scheduledEvents.fetch(eventId);
    if (!event) throw new Error(`Không tìm thấy Sự kiện ID: ${eventId}`);
    await event.delete();
    return { success: true, action: 'DELETE_EVENT', eventId };
  }

  const events = await guild.scheduledEvents.fetch();
  return {
    success: true,
    action: 'LIST_EVENTS',
    events: events.map(e => ({ id: e.id, name: e.name, status: e.status }))
  };
}

module.exports = {
  modifyGuildSettings,
  manageEmojisAndStickers,
  manageSoundboard,
  manageInvites,
  manageScheduledEvents
};
