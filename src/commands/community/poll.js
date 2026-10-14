// src/commands/community/poll.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getEmoji } = require('../../config/emojis');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Tạo cuộc bình chọn chính chủ Discord với thanh % và nút vote')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('question').setDescription('Câu hỏi bình chọn').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Lựa chọn 1 (để trống nếu vote Có/Không)').setRequired(false))
    .addStringOption(opt => opt.setName('option2').setDescription('Lựa chọn 2').setRequired(false))
    .addStringOption(opt => opt.setName('option3').setDescription('Lựa chọn 3').setRequired(false))
    .addStringOption(opt => opt.setName('option4').setDescription('Lựa chọn 4').setRequired(false))
    .addIntegerOption(opt => 
      opt.setName('duration')
        .setDescription('Thời gian mở bình chọn (mặc định: 24 giờ)')
        .setRequired(false)
        .addChoices(
          { name: '1 giờ', value: 1 },
          { name: '4 giờ', value: 4 },
          { name: '8 giờ', value: 8 },
          { name: '24 giờ (1 ngày)', value: 24 },
          { name: '3 ngày', value: 72 },
          { name: '1 tuần (7 ngày)', value: 168 }
        )),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const e = (name) => getEmoji(interaction.client, name);
    const question = interaction.options.getString('question');
    const opt1 = interaction.options.getString('option1');
    const opt2 = interaction.options.getString('option2');
    const opt3 = interaction.options.getString('option3');
    const opt4 = interaction.options.getString('option4');
    const durationHours = interaction.options.getInteger('duration') || 24;

    const rawOptions = [opt1, opt2, opt3, opt4].filter(Boolean);
    const answers = rawOptions.length >= 2 
      ? rawOptions.map(opt => ({ text: opt }))
      : [{ text: 'Có / Đồng ý' }, { text: 'Không / Phản đối' }];

    // Dùng tính năng Discord Native Poll Widget
    try {
      await interaction.channel.send({
        poll: {
          question: { text: question },
          answers: answers,
          allowMultiselect: false,
          duration: durationHours
        }
      });
      return interaction.editReply({ content: `${e('icon_poll')} Đã tạo cuộc bình chọn thành công (${durationHours} giờ)!` });
    } catch {
      // Fallback sang Embed Card nếu kênh không hỗ trợ Native Poll
      const embed = new EmbedBuilder()
        .setColor(0x00B0F4)
        .setTitle(`${e('icon_poll')} Cuộc Bình Chọn`)
        .setDescription(`**${question}**\n\n` + answers.map((a, i) => `🔹 **${i + 1}.** ${a.text}`).join('\n\n'))
        .setFooter({ text: `Tạo bởi: ${interaction.user.tag}` })
        .setTimestamp();

      const msg = await interaction.channel.send({ embeds: [embed] });
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      for (let i = 0; i < answers.length; i++) {
        await msg.react(emojis[i]).catch(() => {});
      }
      return interaction.editReply({ content: `${e('icon_poll')} Đã tạo cuộc bình chọn thành công!` });
    }
  }
};
