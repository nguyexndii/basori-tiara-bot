// src/events/messageReactionAdd.js
// Lắng nghe sự kiện thả cảm xúc toàn cục: Mở khóa nút Thực thi Plan (Zero-Trust) cho Quản gia AI

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { OWNER_ADMIN_IDS } = require('../config/ids');
const { getPendingPlan, deletePendingPlan } = require('../database/storageAdapter');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (!reaction || !user || user.bot) return;

    // Chỉ chấp nhận phản hồi từ Chủ Sở Hữu (Admin tối cao)
    if (!OWNER_ADMIN_IDS.includes(user.id)) return;

    // Đảm bảo reaction và message đã được fetch nếu là partial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        return;
      }
    }
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (err) {
        return;
      }
    }

    const message = reaction.message;
    if (!message.components || message.components.length === 0) return;

    // Tìm xem tin nhắn này có nút bấm butler_execute_PLAN-... hay không
    let planId = null;
    for (const row of message.components) {
      for (const comp of row.components) {
        if (comp.customId && comp.customId.startsWith('butler_execute_')) {
          planId = comp.customId.replace('butler_execute_', '');
          break;
        }
      }
      if (planId) break;
    }

    if (!planId) return;

    const emojiName = reaction.emoji.name;

    // 1. Thả cảm xúc 🔐 -> Mở khóa nút Thực thi thành màu xanh [🟢 XÁC NHẬN THỰC THI NGAY]
    if (emojiName === '🔐') {
      const plan = await getPendingPlan(planId);
      if (!plan) return;

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

      const oldEmbed = message.embeds[0];
      if (oldEmbed) {
        const unlockedEmbed = EmbedBuilder.from(oldEmbed);
        const fields = oldEmbed.fields.map(f => {
          if (f.name.includes('Quy Trình Mở Khóa') || f.name.includes('Mở Khóa')) {
            return {
              name: '🔓 Đã Mở Khóa An Toàn!',
              value: `✅ Xác nhận bởi ${user.username}. Bạn hãy bấm nút [🟢 XÁC NHẬN THỰC THI NGAY] bên dưới!`
            };
          }
          return f;
        });
        unlockedEmbed.setFields(fields);
        await message.edit({ embeds: [unlockedEmbed], components: [unlockedRow] }).catch(() => {});
      } else {
        await message.edit({ components: [unlockedRow] }).catch(() => {});
      }
    }

    // 2. Thả cảm xúc ❌ -> Hủy bỏ kế hoạch an toàn
    else if (emojiName === '❌') {
      await deletePendingPlan(planId);
      await message.edit({
        content: '🔴 Kế hoạch đã bị Hủy bỏ theo yêu cầu của bạn!',
        embeds: [],
        components: []
      }).catch(() => {});
    }
  }
};
