// src/commands/chat/channel.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getEmoji } = require('../../config/emojis');
const { logModAction } = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Quản lý tạo, xóa hoặc đổi tên kênh')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => 
      sub.setName('create')
        .setDescription('Tạo kênh mới')
        .addStringOption(opt => opt.setName('name').setDescription('Tên kênh').setRequired(true))
        .addStringOption(opt => 
          opt.setName('type')
            .setDescription('Loại kênh')
            .setRequired(false)
            .addChoices(
              { name: 'Kênh Text (Văn bản)', value: 'text' },
              { name: 'Kênh Voice (Thoại)', value: 'voice' }
            )))
    .addSubcommand(sub => 
      sub.setName('delete')
        .setDescription('Xóa một kênh')
        .addChannelOption(opt => opt.setName('channel').setDescription('Kênh cần xóa').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('rename')
        .setDescription('Đổi tên kênh')
        .addChannelOption(opt => opt.setName('channel').setDescription('Kênh cần đổi tên').setRequired(true))
        .addStringOption(opt => opt.setName('newname').setDescription('Tên mới').setRequired(true))),

  async execute(interaction) {
    const e = (name) => getEmoji(interaction.client, name);
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const type = interaction.options.getString('type') || 'text';
      const channelType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

      try {
        const newChan = await interaction.guild.channels.create({ name, type: channelType });
        await logModAction(interaction.client, {
          action: 'CREATE CHANNEL',
          target: `#${newChan.name}`,
          moderator: interaction.user,
          reason: 'Tạo kênh mới',
          extra: `Loại: ${type}`
        });

        return interaction.reply({ content: `${e('icon_success')} Đã tạo kênh **#${newChan.name}** thành công!` });
      } catch (err) {
        return interaction.reply({ content: `${e('icon_error')} Lỗi khi tạo kênh: ${err.message}`, ephemeral: true });
      }
    } else if (sub === 'delete') {
      const chan = interaction.options.getChannel('channel');
      const chanName = chan.name;
      try {
        await chan.delete();
        await logModAction(interaction.client, {
          action: 'DELETE CHANNEL',
          target: `#${chanName}`,
          moderator: interaction.user,
          reason: 'Xóa kênh'
        });

        return interaction.reply({ content: `${e('icon_success')} Đã xóa kênh **#${chanName}** thành công!` });
      } catch (err) {
        return interaction.reply({ content: `${e('icon_error')} Lỗi khi xóa kênh: ${err.message}`, ephemeral: true });
      }
    } else if (sub === 'rename') {
      const chan = interaction.options.getChannel('channel');
      const newName = interaction.options.getString('newname');
      const oldName = chan.name;
      try {
        await chan.setName(newName);
        await logModAction(interaction.client, {
          action: 'RENAME CHANNEL',
          target: `#${newName}`,
          moderator: interaction.user,
          reason: `Đổi tên từ #${oldName} sang #${newName}`
        });

        return interaction.reply({ content: `${e('icon_success')} Đã đổi tên kênh từ **#${oldName}** sang **#${newName}** thành công!` });
      } catch (err) {
        return interaction.reply({ content: `${e('icon_error')} Lỗi khi đổi tên kênh: ${err.message}`, ephemeral: true });
      }
    }
  }
};
