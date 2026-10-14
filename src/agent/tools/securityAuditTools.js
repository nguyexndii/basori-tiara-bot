// src/agent/tools/securityAuditTools.js
// Nghiệp vụ Điều tra Audit Log, AutoMod, Anti-Raid, Audit Quyền Hạn & Hoàn tác (Rollback)

const { AutoModerationRuleTriggerType, AutoModerationRuleEventType, PermissionFlagsBits } = require('discord.js');
const { updateSettings } = require('../../database/storageAdapter');

// 1. Truy vấn Audit Logs để điều tra sự việc (Read-Only)
async function queryAuditLogs(guild, args) {
  const { limit = 10, type } = args;

  const options = { limit: Math.min(Number(limit), 25) };
  if (type) options.type = type;

  const logs = await guild.fetchAuditLogs(options);

  const formatted = logs.entries.map(entry => {
    const time = new Date(entry.createdTimestamp).toLocaleTimeString('vi-VN');
    return {
      id: entry.id,
      time,
      action: entry.action,
      executor: entry.executor ? `${entry.executor.username} (${entry.executor.id})` : 'Hệ thống',
      target: entry.target ? (entry.target.tag || entry.target.name || entry.target.id) : null,
      reason: entry.reason || 'Không ghi lý do'
    };
  });

  return {
    success: true,
    action: 'QUERY_AUDIT_LOGS',
    totalEntries: formatted.length,
    entries: formatted
  };
}

// 2. Quét Kiểm Toán Quyền Hạn Server (Audit Permissions - Read-Only)
async function auditServerPermissions(guild) {
  await guild.channels.fetch().catch(() => {});
  await guild.roles.fetch().catch(() => {});

  const everyoneRole = guild.roles.everyone;
  const exposedChannels = [];
  const sensitiveRoles = [];

  const sensitiveKeywords = ['admin', 'mod', 'staff', 'private', 'kin', 'vip', 'log', 'audit', 'secret', 'quan-tri', 'bao-mat'];

  // 1. Quét kênh nhạy cảm nhưng @everyone xem/chat được
  guild.channels.cache.forEach(ch => {
    if (!ch || !ch.isTextBased()) return;
    const lowerName = ch.name.toLowerCase();
    const isSensitive = sensitiveKeywords.some(kw => lowerName.includes(kw));

    if (isSensitive) {
      const perms = ch.permissionsFor(everyoneRole);
      if (perms && perms.has(PermissionFlagsBits.ViewChannel)) {
        exposedChannels.push({
          id: ch.id,
          name: ch.name,
          issue: 'Kênh có tên nhạy cảm nhưng @everyone vẫn có quyền XEM KÊNH!',
          canSend: perms.has(PermissionFlagsBits.SendMessages)
        });
      }
    }
  });

  // 2. Quét các Role thường nhưng sở hữu quyền nguy hiểm
  const dangerousPerms = [
    { flag: PermissionFlagsBits.Administrator, name: 'Administrator' },
    { flag: PermissionFlagsBits.ManageGuild, name: 'ManageGuild' },
    { flag: PermissionFlagsBits.ManageRoles, name: 'ManageRoles' },
    { flag: PermissionFlagsBits.ManageChannels, name: 'ManageChannels' },
    { flag: PermissionFlagsBits.BanMembers, name: 'BanMembers' },
    { flag: PermissionFlagsBits.KickMembers, name: 'KickMembers' },
    { flag: PermissionFlagsBits.MentionEveryone, name: 'MentionEveryone' }
  ];

  guild.roles.cache.forEach(role => {
    if (!role || role.id === guild.id || role.managed) return;

    const matchedDangerous = [];
    dangerousPerms.forEach(dp => {
      if (role.permissions.has(dp.flag)) {
        matchedDangerous.push(dp.name);
      }
    });

    if (matchedDangerous.length > 0) {
      sensitiveRoles.push({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        memberCount: role.members.size,
        dangerousPermissions: matchedDangerous
      });
    }
  });

  return {
    success: true,
    action: 'AUDIT_SERVER_PERMISSIONS',
    exposedChannelsCount: exposedChannels.length,
    exposedChannels,
    sensitiveRolesCount: sensitiveRoles.length,
    sensitiveRoles
  };
}

// 3. Cấu hình quy tắc Discord AutoMod
async function configureDiscordAutoMod(guild, args) {
  const { action = 'create', name = 'AutoMod Chặn Từ Cấm', keywords = [], exemptRoles = [] } = args;

  if (action === 'create' && keywords.length > 0) {
    const rule = await guild.autoModerationRules.create({
      name,
      creatorId: guild.client.user.id,
      enabled: true,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        keywordFilter: keywords
      },
      actions: [
        {
          type: 1 // BlockMessage
        }
      ],
      exemptRoles: exemptRoles
    });

    return { 
      success: true, 
      action: 'CREATE_AUTOMOD_RULE', 
      createdId: rule.id,
      targetId: rule.id, 
      rule: { id: rule.id, name: rule.name },
      afterState: { createdId: rule.id, name: rule.name }
    };
  }

  const rules = await guild.autoModerationRules.fetch();
  return {
    success: true,
    action: 'LIST_AUTOMOD_RULES',
    rules: rules.map(r => ({ id: r.id, name: r.name, enabled: r.enabled }))
  };
}

// 4. Cấu hình Anti-Raid và Anti-Spam thời gian thực
async function configureAntiRaidAndSpam(guild, args) {
  const { antiRaidEnabled, antiSpamEnabled, maxJoinThreshold } = args;

  const updates = {};
  if (antiRaidEnabled !== undefined) updates.antiRaidEnabled = Boolean(antiRaidEnabled);
  if (antiSpamEnabled !== undefined) updates.antiSpamEnabled = Boolean(antiSpamEnabled);
  if (maxJoinThreshold !== undefined) updates.maxJoinThreshold = Number(maxJoinThreshold);

  await updateSettings(guild.id, updates);

  return {
    success: true,
    action: 'CONFIGURE_SECURITY',
    updatedSettings: updates
  };
}

// 5. Hoàn tác Giao Dịch (Rollback Transaction)
async function rollbackTransaction(guild, args) {
  const { transactionId } = args;
  const rollbackEngine = require('../rollbackEngine');
  return await rollbackEngine.rollback(guild, transactionId);
}

module.exports = {
  queryAuditLogs,
  auditServerPermissions,
  configureDiscordAutoMod,
  configureAntiRaidAndSpam,
  rollbackTransaction
};
