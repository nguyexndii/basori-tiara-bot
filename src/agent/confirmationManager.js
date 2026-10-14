// src/agent/confirmationManager.js
// Quản lý Giao diện Zero-Trust: Embed, Reaction 🔐 Unlock Button, Modal XAC NHAN, Kill Switch & Rollback

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const { OWNER_ADMIN_IDS } = require('../config/ids');
const { RISK_COLORS, requiresModalConfirmation } = require('../config/securityPolicy');
const { savePendingPlan, getPendingPlan, deletePendingPlan, getLatestActionSnapshots } = require('../database/storageAdapter');
const { executePlan, triggerKillSwitch } = require('./executionEngine');
const rollbackEngine = require('./rollbackEngine');

// Bộ nhớ đệm chống Race Condition & Double-Click khi người dùng nhấn nút liên tiếp
const inFlightPlans = new Set();

// 1. Gửi Embed Hỏi Lại khi câu lệnh còn mơ hồ hoặc thiếu dữ liệu (Clarification Step)
async function sendClarificationEmbed(target, prompt, questions = []) {
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('❓ Quản Gia Cần Thêm Thông Tin')
    .setDescription(`Tôi đã nhận được yêu cầu: "*${prompt}*"\nTuy nhiên, để đảm bảo an toàn, bạn vui lòng làm rõ các điểm sau:`)
    .addFields(
      questions.map((q, idx) => ({
        name: `🔹 Điểm cần làm rõ #${idx + 1}`,
        value: q,
        inline: false
      }))
    )
    .setFooter({ text: 'Bạn chỉ cần gõ tin nhắn trả lời bổ sung tại kênh này' })
    .setTimestamp();

  if (target.reply) {
    return await target.reply({ embeds: [embed] });
  }
  return await target.send({ embeds: [embed] });
}

// 2. Tối ưu trải nghiệm: Xử lý ngay lập tức các lệnh READ_ONLY (không làm thay đổi server)
async function handleReadOnlyPlan(target, plan) {
  const sendTarget = target.reply ? target : target;
  let processingMsg = null;
  if (target.reply) {
    processingMsg = await target.reply({ content: '🔍 Đang tra cứu thông tin server...' });
  } else {
    processingMsg = await target.send({ content: '🔍 Đang tra cứu thông tin server...' });
  }

  const guild = target.guild;

  try {
    const { executeTool } = require('./tools');
    const results = [];

    for (const action of plan.actions) {
      const res = await executeTool(guild, action.toolName, action.args);
      results.push({ toolName: action.toolName, result: res });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📊 KẾT QUẢ TRA CỨU TỪ QUẢN GIA')
      .setDescription(`Hoàn tất tra cứu cho yêu cầu: "*${plan.prompt}*"`)
      .setTimestamp();

    for (const item of results) {
      if (item.toolName === 'queryAuditLogs') {
        const logsText = item.result.entries.slice(0, 7).map(e => 
          `• \`[${e.time}]\` **${e.executor}**: ${e.action} -> ${e.target || ''}`
        ).join('\n') || 'Không có log gần đây.';
        embed.addFields({ name: '📜 Lịch Sử Audit Logs Gần Nhất', value: logsText });
      } else if (item.toolName === 'summarizeChannelConversation') {
        embed.addFields({ 
          name: `💬 Tóm Tắt Kênh #${item.result.channelName}`, 
          value: item.result.conversationData.slice(0, 1024) 
        });
      } else if (item.toolName === 'inspectPruneCount') {
        embed.addFields({ 
          name: '👥 Thành Viên Inactive', 
          value: `Có ${item.result.inactiveMemberCount} thành viên không hoạt động trong ${item.result.days} ngày qua.` 
        });
      } else if (item.toolName === 'auditServerPermissions') {
        const { exposedChannels = [], sensitiveRoles = [] } = item.result || {};

        if (exposedChannels.length > 0) {
          const chText = exposedChannels.slice(0, 6).map(c => 
            `• <#${c.id}> (\`${c.name}\`): ${c.issue} ${c.canSend ? '*(có thể nhắn tin)*' : ''}`
          ).join('\n');
          embed.addFields({ 
            name: `🚨 Kênh Nhạy Cảm Bị Hở Quyền Cho @everyone (${exposedChannels.length})`, 
            value: chText.slice(0, 1024) 
          });
        } else {
          embed.addFields({ 
            name: '🔒 Kiểm Tra Kênh Nhạy Cảm', 
            value: '✅ An toàn: Không phát hiện kênh nhạy cảm nào bị hở quyền xem cho `@everyone`.' 
          });
        }

        if (sensitiveRoles.length > 0) {
          const roleText = sensitiveRoles.slice(0, 7).map(r => 
            `• <@&${r.id}> (**${r.name}** - ${r.memberCount} thành viên)\n   ↳ Quyền: \`${r.dangerousPermissions.join(', ')}\``
          ).join('\n');
          embed.addFields({ 
            name: `⚠️ Vai Trò Nắm Quyền Quản Trị / Nguy Hiểm (${sensitiveRoles.length})`, 
            value: roleText.slice(0, 1024) 
          });
        } else {
          embed.addFields({ 
            name: '🛡️ Kiểm Tra Vai Trò', 
            value: '✅ An toàn: Không có vai trò thông thường nào sở hữu quyền nguy hiểm.' 
          });
        }
      } else if (item.toolName === 'inspectChannelPermissions') {
        const { channel = {}, everyoneStatus = {}, allowedRoles = [], deniedRoles = [], adminRoles = [] } = item.result || {};

        embed.setTitle(`🔒 BÁO CÁO QUYỀN TRUY CẬP KÊNH #${channel.name || 'UNKNOWN'}`);
        embed.setDescription(`Quyền truy cập thực tế của kênh <#${channel.id}> (\`${channel.id}\`)`);

        const everyoneDesc = everyoneStatus.canView 
          ? '🌐 **@everyone:** `✅ Được Xem Kênh`' + (everyoneStatus.canSend ? ' • `✅ Được Nhắn Tin`' : ' • `❌ Bị Chặn Nhắn Tin`')
          : '🔒 **@everyone:** `❌ BỊ CHẶN XEM KÊNH (Kênh Kín)`';
        embed.addFields({ name: '1. Trạng Thái Hiệu Dụng Của @everyone', value: everyoneDesc });

        if (allowedRoles.length > 0) {
          const roleList = allowedRoles.map(r => {
            const eff = r.effective ? `[Xem: ${r.effective.canView ? '✅' : '❌'}, Chat: ${r.effective.canSend ? '✅' : '❌'}]` : '';
            return `• <@&${r.id}>: \`${r.permissions.join(', ')}\` ${eff}`;
          }).join('\n');
          embed.addFields({ name: `2. Các Role Được Cấp Quyền Riêng (${allowedRoles.length})`, value: roleList.slice(0, 1024) });
        } else {
          embed.addFields({ name: '2. Các Role Được Cấp Quyền Riêng', value: 'Không có Role nào được cấp quyền ghi đè.' });
        }

        if (deniedRoles.length > 0) {
          const deniedList = deniedRoles.map(r => `• <@&${r.id}>: \`${r.permissions.join(', ')}\``).join('\n');
          embed.addFields({ name: `3. Các Role Bị Chặn Riêng (${deniedRoles.length})`, value: deniedList.slice(0, 1024) });
        }

        if (adminRoles.length > 0) {
          const adminList = adminRoles.map(r => `<@&${r.id}>`).join(', ');
          embed.addFields({ name: '4. Role Có Quyền Quản Trị Viên (Mặc định xem được)', value: adminList.slice(0, 1024) });
        }
      } else {
        embed.addFields({
          name: `📌 Kết Quả: \`${item.toolName}\``,
          value: `\`\`\`json\n${JSON.stringify(item.result, null, 2).slice(0, 1000)}\n\`\`\``
        });
      }
    }

    await processingMsg.edit({ content: null, embeds: [embed] });
  } catch (err) {
    await processingMsg.edit({ content: `❌ Lỗi tra cứu: ${err.message}` });
  }
}

// 3. Xuất Bản Nháp Kế Hoạch (Dry-Run Preview Embed) & Reaction Collector mở khóa
async function sendPlanPreviewEmbed(target, plan, author = null) {
  const planId = `PLAN-${Date.now().toString(36).toUpperCase()}`;
  const guild = target.guild;
  const adminId = author ? author.id : (target.author ? target.author.id : (target.user ? target.user.id : 'ADMIN'));
  const channelId = target.channel ? target.channel.id : target.id;

  plan.planId = planId;
  plan.guildId = guild.id;
  plan.adminId = adminId;
  plan.channelId = channelId;
  plan.expiresAt = new Date(Date.now() + 90 * 1000); // Tự hủy sau 90 giây

  await savePendingPlan(plan);

  const embedColor = RISK_COLORS[plan.riskLevel] || 0x2ECC71;

  // Tạo tóm tắt từng bước
  const stepsText = plan.actions.map((act, idx) => {
    const argsSummary = Object.entries(act.args || {})
      .map(([k, v]) => `${k}: \`${typeof v === 'object' ? JSON.stringify(v) : v}\``)
      .join(', ');
    return `**${idx + 1}. \`${act.toolName}\`**\n   ↳ ${argsSummary || 'Mặc định'}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle('🛡️ BẢNG KẾ HOẠCH THỰC THI - CHỜ PHÊ DUYỆT')
    .setDescription(`Mục tiêu: "*${plan.prompt}*"\n\nMức độ rủi ro: \`${plan.riskLevel}\` • Hỗ trợ Rollback: Có`)
    .addFields(
      { name: '📋 Chi Tiết Từng Bước Sẽ Chạy', value: stepsText.slice(0, 1024) },
      { 
        name: '🔐 Quy Trình Mở Khóa An Toàn (Zero-Trust)', 
        value: 'Để chống bấm nhầm, bạn hãy thả cảm xúc `🔐` vào tin nhắn này để mở khóa nút thực thi bên dưới!' 
      }
    )
    .setFooter({ text: `Plan ID: ${planId} • Tự hủy sau 90 giây nếu không xác nhận` })
    .setTimestamp();

  // 4 Nút bấm điều khiển (Nút Thực thi ban đầu bị khóa, cần thả 🔐 để mở)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`butler_execute_${planId}`)
      .setLabel('🔒 Thực thi Kế hoạch (Thả 🔐 để mở khóa)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`butler_edit_${planId}`)
      .setLabel('✏️ Chỉnh sửa')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`butler_json_${planId}`)
      .setLabel('🔍 Xem JSON')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`butler_cancel_${planId}`)
      .setLabel('🔴 Hủy bỏ')
      .setStyle(ButtonStyle.Danger)
  );

  let previewMessage = null;
  if (target.reply) {
    previewMessage = await target.reply({
      embeds: [embed],
      components: [row]
    });
  } else {
    previewMessage = await target.send({
      embeds: [embed],
      components: [row]
    });
  }

  plan.messageId = previewMessage.id;
  await savePendingPlan(plan);

  // Bot tự thả sẵn 2 reaction 🔐 và ❌ để người dùng bấm nhanh 1-Click
  await previewMessage.react('🔐').catch(() => {});
  await previewMessage.react('❌').catch(() => {});

  // Tự động hủy nếu không ai bấm trong 90 giây
  setTimeout(async () => {
    const p = await getPendingPlan(planId);
    if (p) {
      await deletePendingPlan(planId);
      await previewMessage.edit({
        content: '⏳ Kế hoạch đã hết hạn 90 giây và tự động hủy bỏ an toàn.',
        components: []
      }).catch(() => {});
    }
  }, 90 * 1000);
}

// 4. Xử lý Interaction (Button & Modal) cho Quản gia AI
async function handleButlerInteraction(interaction) {
  if (!interaction.customId || !interaction.customId.startsWith('butler_')) return false;

  // Kiểm tra quyền Admin tối cao
  if (!OWNER_ADMIN_IDS.includes(interaction.user.id)) {
    return interaction.reply({
      content: '🚫 TRUY CẬP BỊ TỪ CHỐI: Bạn không có quyền tương tác với bảng điều khiển Quản gia!',
      ephemeral: true
    });
  }

  const [, action, planId] = interaction.customId.split('_');

  // --- NÚT CHỈNH SỬA (Mở Modal nhập yêu cầu) ---
  if (action === 'edit') {
    const plan = await getPendingPlan(planId);
    if (!plan) {
      return interaction.reply({ content: '❌ Kế hoạch đã hết hạn hoặc không tìm thấy.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`butler_editmodal_${planId}`)
      .setTitle('Chỉnh Sửa Kế Hoạch Quản Gia');

    const editInput = new TextInputBuilder()
      .setCustomId('edit_requirements')
      .setLabel('Nhập yêu cầu sửa đổi / bổ sung:')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ví dụ: Thêm bước khóa quyền xem của @everyone...')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(editInput));
    return interaction.showModal(modal);
  }

  // --- NÚT HỦY BỎ ---
  if (action === 'cancel') {
    await deletePendingPlan(planId);
    return interaction.update({
      content: '🔴 **Đã hủy kế hoạch thành công!**',
      embeds: [],
      components: []
    });
  }

  // --- NÚT XEM JSON PAYLOAD ---
  if (action === 'json') {
    const plan = await getPendingPlan(planId);
    if (!plan) return interaction.reply({ content: '❌ Kế hoạch đã hết hạn.', ephemeral: true });
    return interaction.reply({
      content: `\`\`\`json\n${JSON.stringify(plan.actions, null, 2).slice(0, 1950)}\n\`\`\``,
      ephemeral: true
    });
  }

  // --- NÚT DỪNG KHẨN CẤP (KILL SWITCH) ---
  if (action === 'kill') {
    const txId = planId;
    triggerKillSwitch(txId);
    return interaction.reply({
      content: `🛑 **ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP CHO GIAO DỊCH ${txId}!** Đang lập tức ngắt tiến trình và hoàn tác...`,
      ephemeral: true
    });
  }

  // --- NÚT HOÀN TÁC (ROLLBACK & FORCEROLLBACK) ---
  if (action === 'rollback' || action === 'forcerollback') {
    const txId = planId;

    if (inFlightPlans.has(`rb_${txId}`)) {
      return interaction.reply({
        content: '⏳ Phiên này đang trong quá trình hoàn tác, vui lòng không nhấn liên tục!',
        ephemeral: true
      });
    }

    // Nếu không phải ép buộc hoàn tác, kiểm tra xem có phải phiên mới nhất không
    if (action === 'rollback') {
      const latestSnapshots = await getLatestActionSnapshots(interaction.guild.id, 5);
      if (latestSnapshots && latestSnapshots.length > 0) {
        const newest = latestSnapshots[0];
        if (newest.transactionId !== txId) {
          // Phiên này không phải là phiên mới nhất
          const alertEmbed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('⚠️ CẢNH BÁO: HOÀN TÁC PHIÊN CŨ KHÔNG PHẢI MỚI NHẤT')
            .setDescription(
              `Phiên \`${txId}\` **không phải là phiên mới nhất** của máy chủ!\n\n` +
              `Đã có phiên \`${newest.transactionId}\` (*"${newest.prompt}"*) được hoàn tất sau phiên này.\n\n` +
              `⚠️ **Rủi ro:** Hoàn tác một phiên cũ có thể gây xung đột quyền hoặc cấu hình với những thay đổi được tạo ra sau đó.\n\n` +
              `Sếp có chắc chắn muốn ép buộc hoàn tác phiên này không?`
            )
            .setTimestamp();

          const alertRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`butler_forcerollback_${txId}`)
              .setLabel('⚠️ Tôi hiểu rủi ro - Tiếp tục Hoàn tác')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`butler_cancel_${txId}`)
              .setLabel('Hủy bỏ')
              .setStyle(ButtonStyle.Secondary)
          );

          return interaction.reply({ embeds: [alertEmbed], components: [alertRow], ephemeral: true });
        }
      }
    }

    inFlightPlans.add(`rb_${txId}`);
    await interaction.deferReply();
    try {
      const res = await rollbackEngine.rollback(interaction.guild, txId);
      return interaction.editReply({
        content: `✅ **HOÀN TÁC THÀNH CÔNG 100%!**\nĐã khôi phục toàn bộ ${res.rolledBackCount} thao tác của phiên \`${txId}\` về trạng thái ban đầu.`
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Lỗi Rollback: ${err.message}` });
    } finally {
      inFlightPlans.delete(`rb_${txId}`);
    }
  }

  // --- NÚT THỰC THI (EXECUTE) ---
  if (action === 'execute') {
    if (inFlightPlans.has(planId)) {
      return interaction.reply({
        content: '⏳ Kế hoạch này đang được khởi động, vui lòng không nhấn liên tục!',
        ephemeral: true
      });
    }

    const plan = await getPendingPlan(planId);
    if (!plan) {
      return interaction.reply({ content: '❌ Kế hoạch đã hết hạn hoặc không tìm thấy.', ephemeral: true });
    }

    // Nếu là lệnh CRITICAL -> Mở Modal bắt gõ XAC NHAN
    if (requiresModalConfirmation(plan)) {
      const modal = new ModalBuilder()
        .setCustomId(`butler_modal_${planId}`)
        .setTitle('Xác Nhận Tác Vụ Rủi Ro Cao');

      const confirmInput = new TextInputBuilder()
        .setCustomId('confirm_text')
        .setLabel('Gõ chữ "XAC NHAN" để tiến hành:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('XAC NHAN')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
      return interaction.showModal(modal);
    }

    // Nếu không cần modal -> Chạy ngay
    await runExecutionWorkflow(interaction, plan);
  }

  return true;
}

// 5. Xử lý Modal Submit
async function handleButlerModalSubmit(interaction) {
  // Xử lý Modal Chỉnh sửa yêu cầu
  if (interaction.customId.startsWith('butler_editmodal_')) {
    const planId = interaction.customId.replace('butler_editmodal_', '');
    const plan = await getPendingPlan(planId);
    if (!plan) {
      return interaction.reply({ content: '❌ Kế hoạch đã hết hạn hoặc không tìm thấy.', ephemeral: true });
    }

    const editFeedback = interaction.fields.getTextInputValue('edit_requirements');
    await deletePendingPlan(planId);

    await interaction.deferReply();

    const combinedPrompt = `${plan.prompt} (Yêu cầu chỉnh sửa: ${editFeedback.trim()})`;

    const { processAdminPrompt } = require('./agentController');
    return await processAdminPrompt({
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      prompt: combinedPrompt,
      replyTarget: interaction,
      isInteraction: true
    });
  }

  // Xử lý Modal Xác nhận Tác vụ Rủi ro cao
  if (!interaction.customId.startsWith('butler_modal_')) return false;

  const planId = interaction.customId.replace('butler_modal_', '');
  if (inFlightPlans.has(planId)) {
    return interaction.reply({
      content: '⏳ Kế hoạch này đang được khởi động, vui lòng không nhấn liên tục!',
      ephemeral: true
    });
  }

  const plan = await getPendingPlan(planId);
  if (!plan) return interaction.reply({ content: '❌ Kế hoạch đã hết hạn.', ephemeral: true });

  const input = interaction.fields.getTextInputValue('confirm_text');
  if (input.trim() !== 'XAC NHAN') {
    return interaction.reply({
      content: '❌ Bạn chưa gõ đúng chữ XAC NHAN. Tác vụ rủi ro cao đã bị hủy để đảm bảo an toàn!',
      ephemeral: true
    });
  }

  await runExecutionWorkflow(interaction, plan);
  return true;
}

// 6. Quy trình chạy thực tế với Embed cập nhật tiến độ & Nút Kill Switch
async function runExecutionWorkflow(interaction, plan) {
  if (inFlightPlans.has(plan.planId)) return;
  inFlightPlans.add(plan.planId);

  let statusMsg = null;
  const statusEmbed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('⚙️ QUẢN GIA ĐANG THỰC THI KẾ HOẠCH...')
    .setDescription(`Đang xử lý: "*${plan.prompt}*"\n\n⏳ Chuẩn bị chạy ${plan.actions.length} bước...`)
    .setTimestamp();

  try {
    await interaction.deferUpdate().catch(() => {});
    await deletePendingPlan(plan.planId);

    const killRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`butler_kill_${plan.planId}`)
        .setLabel('🛑 DỪNG KHẨN CẤP (KILL SWITCH)')
        .setStyle(ButtonStyle.Danger)
    );

    statusMsg = await interaction.message.edit({
      embeds: [statusEmbed],
      components: [killRow]
    });

    const onProgress = async (step, total, toolName) => {
      statusEmbed.setDescription(
        `Đang xử lý: "*${plan.prompt}*"\n\n⏳ Đang chạy bước ${step}/${total}: \`${toolName}\`...`
      );
      if (statusMsg) await statusMsg.edit({ embeds: [statusEmbed] }).catch(() => {});
    };

    const execResult = await executePlan(interaction.guild, plan, interaction.user.id, onProgress);

    if (execResult.aborted) {
      if (statusMsg) {
        await statusMsg.edit({
          content: `🛑 Đã dừng khẩn cấp và hoàn tác thành công!\nTransaction: \`${execResult.transactionId}\``,
          embeds: [],
          components: []
        });
      }
      return;
    }

    // Hoàn thành xuất sắc -> Hiện nút Rollback
    const doneEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ THỰC THI HOÀN TẤT THÀNH CÔNG!')
      .setDescription(`Toàn bộ ${execResult.totalSteps} bước đã được thực thi chuẩn xác theo yêu cầu của bạn!`)
      .addFields(
        { name: '🏷️ Transaction ID', value: `\`${execResult.transactionId}\``, inline: true },
        { name: '🛡️ Bảo Hiểm Hoàn Tác', value: 'Bạn có thể bấm nút Hoàn tác bên dưới để phục hồi bất cứ lúc nào.', inline: true }
      )
      .setTimestamp();

    const rollbackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`butler_rollback_${execResult.transactionId}`)
        .setLabel('⏪ Hoàn tác (Rollback phiên này)')
        .setStyle(ButtonStyle.Danger)
    );

    if (statusMsg) {
      await statusMsg.edit({ embeds: [doneEmbed], components: [rollbackRow] });
    }
  } catch (err) {
    statusEmbed.setColor(0xE74C3C)
      .setTitle('❌ ĐÃ XẢY RA LỖI TRONG QUÁ TRÌNH THỰC THI')
      .setDescription(`Lỗi: **${err.message}**\nCác bước trước đó đã được lưu vết an toàn.`);
    if (statusMsg) {
      await statusMsg.edit({ embeds: [statusEmbed], components: [] }).catch(() => {});
    }
  } finally {
    inFlightPlans.delete(plan.planId);
  }
}

module.exports = {
  sendClarificationEmbed,
  handleReadOnlyPlan,
  sendPlanPreviewEmbed,
  handleButlerInteraction,
  handleButlerModalSubmit
};
