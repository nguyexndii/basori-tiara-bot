// src/events/interactionCreate.js
// Xử lý sự kiện khi có tương tác (Slash Commands, Butler Buttons & Modals)

const { checkCooldown } = require('../utils/rateLimiter');
const { logCommandUsage, logSystemError } = require('../utils/logger');
const { handleButlerInteraction, handleButlerModalSubmit } = require('../agent/confirmationManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Xử lý Modal Submit của Quản gia AI
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('butler_')) {
        return await handleButlerModalSubmit(interaction).catch(err => {
          console.error('Lỗi xử lý Modal Quản gia:', err);
        });
      }
      return;
    }

    // 2. Xử lý Button Click của Quản gia AI
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('butler_')) {
        return await handleButlerInteraction(interaction).catch(err => {
          console.error('Lỗi xử lý Button Quản gia:', err);
        });
      }
      return;
    }

    // 3. Xử lý Slash Commands thông thường
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`Không tìm thấy lệnh khớp với ${interaction.commandName}`);
      return;
    }

    // Kiểm tra Cooldown (Rate Limiting)
    const cooldownTime = command.cooldown || 3;
    const timeLeft = checkCooldown(interaction.commandName, interaction.user.id, cooldownTime);
    if (timeLeft !== null) {
      return interaction.reply({
        content: `⏳ Bạn đang thao tác quá nhanh! Vui lòng chờ **${timeLeft.toFixed(1)}s** nữa trước khi dùng lại lệnh này.`,
        ephemeral: true
      });
    }

    // Kiểm tra phân quyền thời gian thực (Runtime Authorization Check)
    if (command.data.default_member_permissions && interaction.member) {
      const requiredPerms = BigInt(command.data.default_member_permissions);
      if (!interaction.member.permissions.has(requiredPerms)) {
        return interaction.reply({
          content: '❌ Bạn không có đủ quyền hạn trong máy chủ để thực hiện câu lệnh này!',
          ephemeral: true
        });
      }
    }

    // Ghi log gọi lệnh vào kênh chỉ định
    await logCommandUsage(client, interaction).catch(() => {});

    // Thực thi câu lệnh an toàn với try/catch
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('❌ Lỗi khi thực thi lệnh /%s:', interaction.commandName, error);
      await logSystemError(client, `Lỗi Thực Thi /${interaction.commandName}`, error);

      const errorMessage = {
        content: '❌ Đã xảy ra lỗi bất ngờ khi thực hiện câu lệnh này! Sự cố đã được tự động báo về Ban Quản Trị.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
  }
};
