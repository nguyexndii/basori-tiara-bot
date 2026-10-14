// src/agent/tools/securityAuditTools.js
// Nghiệp vụ Điều tra Audit Log, AutoMod, Anti-Raid & Hoàn tác (Rollback)

const { AutoModerationRuleTriggerType, AutoModerationRuleEventType } = require('discord.js');
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

// 2. Cấu hình quy tắc Discord AutoMod
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

    return { success: true, action: 'CREATE_AUTOMOD_RULE', rule: { id: rule.id, name: rule.name } };
  }

  const rules = await guild.autoModerationRules.fetch();
  return {
    success: true,
    action: 'LIST_AUTOMOD_RULES',
    rules: rules.map(r => ({ id: r.id, name: r.name, enabled: r.enabled }))
  };
}

// 3. Cấu hình Anti-Raid và Anti-Spam thời gian thực
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

// 4. Hoàn tác Giao Dịch (Rollback Transaction)
async function rollbackTransaction(guild, args) {
  const { transactionId } = args;
  const rollbackEngine = require('../rollbackEngine');
  return await rollbackEngine.rollback(guild, transactionId);
}

module.exports = {
  queryAuditLogs,
  configureDiscordAutoMod,
  configureAntiRaidAndSpam,
  rollbackTransaction
};
