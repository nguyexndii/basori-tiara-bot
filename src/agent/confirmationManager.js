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
const { savePendingPlan, getPendingPlan, deletePendingPlan } = require('../database/storageAdapter');
const { executePlan, triggerKillSwitch } = require('./executionEngine');
const rollbackEngine = require('./rollbackEngine');

// 1. Gửi Embed Hỏi Lại khi câu lệnh còn mơ hồ hoặc thiếu dữ liệu (Clarification Step)
async function sendClarificationEmbed(message, prompt, questions = []) {
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('❓ Quản Gia Cần Thêm Thông Tin')
    .setDescription(`Tôi đã nhận được yêu cầu của Sếp: *"**${prompt}**"*\nTuy nhiên, để đảm bảo an toàn tuyệt đối, Sếp vui lòng làm rõ các điểm sau:`)
    .addFields(
      questions.map((q, idx) => ({
        name: `🔹 Điểm cần làm rõ #${idx + 1}`,
        value: q,
        inline: false
      }))
    )
    .setFooter({ text: 'Sếp chỉ cần gõ tin nhắn trả lời bổ sung tại kênh này!' })
    .setTimestamp();

  return await message.reply({ embeds: [embed] });
}

// 2. Tối ưu trải nghiệm: Xử lý ngay lập tức các lệnh READ_ONLY (không làm thay đổi server)
async function handleReadOnlyPlan(message, plan) {
  const processingMsg = await message.reply({
    content: '🔍 Đang tra cứu thông tin server theo yêu cầu của Sếp...'
  });

  try {
    const { executeTool } = require('./tools');
    const results = [];

    for (const action of plan.actions) {
      const res = await executeTool(message.guild, action.toolName, action.args);
      results.push({ toolName: action.toolName, result: res });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📊 KẾT QUẢ TRA CỨU TỪ QUẢN GIA')
      .setDescription(`Hoàn tất tra cứu cho yêu cầu: *"**${plan.prompt}**"*`)
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
          value: `Có **${item.result.inactiveMemberCount}** thành viên không hoạt động trong ${item.result.days} ngày qua.` 
        });
      }
    }

    await processingMsg.edit({ content: null, embeds: [embed] });
  } catch (err) {
    await processingMsg.edit({ content: `❌ Lỗi tra cứu: ${err.message}` });
  }
}

// 3. Xuất Bản Nháp Kế Hoạch (Dry-Run Preview Embed) & Reaction Collector mở khóa
async function sendPlanPreviewEmbed(message, plan) {
  const planId = `PLAN-${Date.now().toString(36).toUpperCase()}`;
  plan.planId = planId;
  plan.guildId = message.guild.id;
  plan.adminId = message.author.id;
  plan.channelId = message.channel.id;
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
    .setTitle('🛡️ BẢNG KẾ HOẠCH THỰC THI - CHỜ ADMIN PHÊ DUYỆT')
    .setDescription(`**Mục tiêu của Sếp:** *"**${plan.prompt}**"*\n\n**Mức độ rủi ro:** \`${plan.riskLevel}\`\n**Hỗ trợ Rollback:** \`✅ 100% An Toàn\``)
    .addFields(
      { name: '📋 Chi Tiết Từng Bước Sẽ Chạy', value: stepsText.slice(0, 1024) },
      { 
        name: '🔐 Quy Trình Mở Khóa An Toàn (Zero-Trust)', 
        value: 'Để chống bấm nhầm, **Sếp hãy thả cảm xúc `🔐` vào tin nhắn này** để mở khóa nút thực thi bên dưới!' 
      }
    )
    .setFooter({ text: `Plan ID: ${planId} • Tự hủy sau 90 giây nếu không xác nhận` })
    .setTimestamp();

  // 4 Nút bấm (Nút Thực thi ban đầu bị disabled: true)
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

  const previewMessage = await message.reply({
    embeds: [embed],
    components: [row]
  });

  plan.messageId = previewMessage.id;
  await savePendingPlan(plan);

  // Bot tự thả sẵn 2 reaction 🔐 và ❌
  await previewMessage.react('🔐').catch(() => {});
  await previewMessage.react('❌').catch(() => {});

  // Khởi tạo ReactionCollector lắng nghe trong 90 giây
  const filter = (reaction, user) => 
    ['🔐', '❌'].includes(reaction.emoji.name) && OWNER_ADMIN_IDS.includes(user.id);

  const collector = previewMessage.createReactionCollector({ filter, time: 90 * 1000, max: 1 });

  collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.name === '🔐') {
      // Mở khóa nút Thực thi thành [🟢 XÁC NHẬN THỰC THI NGAY]
      const unlockedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`butler_execute_${planId}`)
          .setLabel('🟢 XÁC NHẬN THỰC THI NGAY')
          .setStyle(ButtonStyle.Success)
          .setDisabled(false),
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

      const unlockedEmbed = EmbedBuilder.from(embed)
        .spliceFields(1, 1, {
          name: '🔓 Đã Mở Khóa An Toàn!',
          value: `✅ Xác nhận bởi **${user.username}**. Sếp hãy bấm nút **[🟢 XÁC NHẬN THỰC THI NGAY]** bên dưới!`
        });

      await previewMessage.edit({ embeds: [unlockedEmbed], components: [unlockedRow] }).catch(() => {});
    } else if (reaction.emoji.name === '❌') {
      await deletePendingPlan(planId);
      await previewMessage.edit({
        content: '🔴 **Kế hoạch đã bị Hủy bỏ theo yêu cầu của Sếp!**',
        embeds: [],
        components: []
      }).catch(() => {});
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      await deletePendingPlan(planId);
      await previewMessage.edit({
        content: '⏳ **Kế hoạch đã hết hạn 90 giây và tự động hủy bỏ an toàn.**',
        components: []
      }).catch(() => {});
    }
  });
}

// 4. Xử lý Interaction (Button & Modal) cho Quản gia AI
async function handleButlerInteraction(interaction) {
  if (!interaction.customId || !interaction.customId.startsWith('butler_')) return false;

  // Kiểm tra quyền Admin tối cao
  if (!OWNER_ADMIN_IDS.includes(interaction.user.id)) {
    return interaction.reply({
      content: '🚫 **TRUY CẬP BỊ TỪ CHỐI:** Bạn không có quyền tương tác với bảng điều khiển Quản gia!',
      ephemeral: true
    });
  }

  const [, action, planId] = interaction.customId.split('_');

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

  // --- NÚT HOÀN TÁC (ROLLBACK) ---
  if (action === 'rollback') {
    const txId = planId;
    await interaction.deferReply();
    try {
      const res = await rollbackEngine.rollback(interaction.guild, txId);
      return interaction.editReply({
        content: `✅ **HOÀN TÁC THÀNH CÔNG 100%!**\nĐã khôi phục toàn bộ ${res.rolledBackCount} thao tác của phiên \`${txId}\` về trạng thái ban đầu.`
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Lỗi Rollback: ${err.message}` });
    }
  }

  // --- NÚT THỰC THI (EXECUTE) ---
  if (action === 'execute') {
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
  if (!interaction.customId.startsWith('butler_modal_')) return false;

  const planId = interaction.customId.replace('butler_modal_', '');
  const plan = await getPendingPlan(planId);
  if (!plan) return interaction.reply({ content: '❌ Kế hoạch đã hết hạn.', ephemeral: true });

  const input = interaction.fields.getTextInputValue('confirm_text');
  if (input.trim() !== 'XAC NHAN') {
    return interaction.reply({
      content: '❌ Bạn chưa gõ đúng chữ **XAC NHAN**. Tác vụ rủi ro cao đã bị hủy để đảm bảo an toàn!',
      ephemeral: true
    });
  }

  await runExecutionWorkflow(interaction, plan);
  return true;
}

// 6. Quy trình chạy thực tế với Embed cập nhật tiến độ & Nút Kill Switch
async function runExecutionWorkflow(interaction, plan) {
  await interaction.deferUpdate().catch(() => {});
  await deletePendingPlan(plan.planId);

  const statusEmbed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('⚙️ QUẢN GIA ĐANG THỰC THI KẾ HOẠCH...')
    .setDescription(`Đang xử lý: *"**${plan.prompt}**"*\n\n⏳ Chuẩn bị chạy ${plan.actions.length} bước...`)
    .setTimestamp();

  const killRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`butler_kill_${plan.planId}`)
      .setLabel('🛑 DỪNG KHẨN CẤP (KILL SWITCH)')
      .setStyle(ButtonStyle.Danger)
  );

  const statusMsg = await interaction.message.edit({
    embeds: [statusEmbed],
    components: [killRow]
  });

  const onProgress = async (step, total, toolName) => {
    statusEmbed.setDescription(
      `Đang xử lý: *"**${plan.prompt}**"*\n\n⏳ **Đang chạy bước ${step}/${total}:** \`${toolName}\`...`
    );
    await statusMsg.edit({ embeds: [statusEmbed] }).catch(() => {});
  };

  try {
    const execResult = await executePlan(interaction.guild, plan, interaction.user.id, onProgress);

    if (execResult.aborted) {
      return statusMsg.edit({
        content: `🛑 **ĐÃ DỪNG KHẨN CẤP VÀ HOÀN TÁC THÀNH CÔNG!**\nTransaction: \`${execResult.transactionId}\``,
        embeds: [],
        components: []
      });
    }

    // Hoàn thành xuất sắc -> Hiện nút Rollback
    const doneEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ THỰC THI HOÀN TẤT THÀNH CÔNG!')
      .setDescription(`Toàn bộ **${execResult.totalSteps} bước** đã được thực thi chuẩn xác theo yêu cầu của Sếp!`)
      .addFields(
        { name: '🏷️ Transaction ID', value: `\`${execResult.transactionId}\``, inline: true },
        { name: '🛡️ Bảo Hiểm Hoàn Tác', value: 'Sếp có thể bấm nút Hoàn tác bên dưới để phục hồi bất cứ lúc nào.', inline: true }
      )
      .setTimestamp();

    const rollbackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`butler_rollback_${execResult.transactionId}`)
        .setLabel('⏪ Hoàn tác (Rollback phiên này)')
        .setStyle(ButtonStyle.Danger)
    );

    await statusMsg.edit({ embeds: [doneEmbed], components: [rollbackRow] });
  } catch (err) {
    statusEmbed.setColor(0xE74C3C)
      .setTitle('❌ ĐÃ XẢY RA LỖI TRONG QUÁ TRÌNH THỰC THI')
      .setDescription(`Lỗi: **${err.message}**\nCác bước trước đó đã được lưu vết an toàn.`);
    await statusMsg.edit({ embeds: [statusEmbed], components: [] });
  }
}

module.exports = {
  sendClarificationEmbed,
  handleReadOnlyPlan,
  sendPlanPreviewEmbed,
  handleButlerInteraction,
  handleButlerModalSubmit
};
