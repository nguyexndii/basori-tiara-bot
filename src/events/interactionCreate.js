// src/events/interactionCreate.js
// Xử lý sự kiện khi có tương tác (Slash Commands) từ người dùng

const { checkCooldown } = require('../utils/rateLimiter');
const { logCommandUsage, logSystemError } = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`Không tìm thấy lệnh khớp với ${interaction.commandName}`);
      return;
    }

    // 1. Kiểm tra Cooldown (Rate Limiting)
    const cooldownTime = command.cooldown || 3;
    const timeLeft = checkCooldown(interaction.commandName, interaction.user.id, cooldownTime);
    if (timeLeft !== null) {
      return interaction.reply({
        content: `⏳ Bạn đang thao tác quá nhanh! Vui lòng chờ **${timeLeft.toFixed(1)}s** nữa trước khi dùng lại lệnh này.`,
        ephemeral: true
      });
    }

    // 2. Kiểm tra phân quyền thời gian thực (Runtime Authorization Check)
    if (command.data.default_member_permissions && interaction.member) {
      const requiredPerms = BigInt(command.data.default_member_permissions);
      if (!interaction.member.permissions.has(requiredPerms)) {
        return interaction.reply({
          content: '❌ Bạn không có đủ quyền hạn trong máy chủ để thực hiện câu lệnh này!',
          ephemeral: true
        });
      }
    }

    // 3. Ghi log gọi lệnh vào kênh chỉ định
    await logCommandUsage(client, interaction).catch(() => {});

    // 4. Thực thi câu lệnh an toàn với try/catch
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
