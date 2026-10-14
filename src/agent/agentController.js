// src/agent/agentController.js
// Bộ Điều Phối Trung Tâm của Quản Gia AI: Giao tiếp Gemini, Phân tích Ý định & Phân luồng Thực thi

const { buildServerContext } = require('./contextBuilder');
const { callGeminiWithCascade } = require('./geminiClient');
const { functionDeclarations } = require('./tools');
const { calculatePlanRisk, RISK_LEVELS } = require('../config/securityPolicy');
const { sendClarificationEmbed, handleReadOnlyPlan, sendPlanPreviewEmbed } = require('./confirmationManager');

// Tool đặc biệt để AI hỏi lại khi lệnh còn mơ hồ
const CLARIFICATION_TOOL = {
  name: 'request_clarification',
  description: 'Gọi công cụ này khi yêu cầu của Admin còn mơ hồ, thiếu thông số quan trọng (vd: chưa rõ tạo trong Category nào, phân quyền cho Role nào)',
  parameters: {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Danh sách các câu hỏi cụ thể cần Admin làm rõ'
      },
      suggestions: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Các gợi ý lựa chọn cho Admin'
      }
    },
    required: ['questions']
  }
};

const ALL_TOOLS = [CLARIFICATION_TOOL, ...functionDeclarations];

/**
 * Tạo System Instruction huấn luyện tư duy Quản gia AI
 */
function buildSystemInstruction(serverContext, currentChannel, conversationHistory = []) {
  const everyoneRoleId = (serverContext.guild && serverContext.guild.everyoneRoleId) || 'everyone';
  const adminRole = (serverContext.roles || []).find(r => r.isAdmin && !r.isEveryone);
  const adminRoleId = adminRole ? adminRole.id : null;
  const currentChName = currentChannel ? currentChannel.name : 'agent-demo';
  const currentChId = currentChannel ? currentChannel.id : '1559786977040011284';

  return `Bạn là AI hỗ trợ quản trị kỹ thuật của máy chủ Discord Basori Tiara.
GIAO TIẾP:
- Ngắn gọn, súc tích, tự nhiên, đi thẳng vào trọng tâm.
- TUYỆT ĐỐI KHÔNG dùng các từ ngữ hạ mình, nịnh bợ như: "Chủ Sở Hữu", "Ngài", "Sếp", "Dạ thưa", "em", "tuân lệnh".
- Xưng "tôi" và gọi người dùng là "bạn", hoặc trả lời thẳng kết quả.

=== KÊNH ADMIN ĐANG TRÒ CHUYỆN HIỆN TẠI ===
Tên kênh: #${currentChName}
ID kênh: ${currentChId}
👉 KHI BẠN HOẶC NGƯỜI DÙNG NÓI "KÊNH NÀY": MẶC ĐỊNH CHÍNH LÀ KÊNH HIỆN TẠI CÓ ID '${currentChId}'!

=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY (CHAT MEMORY) ===
${conversationHistory.length > 0 ? conversationHistory.join('\n') : 'Chưa có lịch sử trước đó.'}
==============================================

=== CẤU TRÚC SERVER HIỆN TẠI ===
${JSON.stringify(serverContext, null, 2)}
================================

=== NGUYÊN TẮC HÀNH XỬ QUAN TRỌNG NHẤT (ƯU TIÊN HÀNH ĐỘNG) ===
1. KHI NGƯỜI DÙNG HỎI VỀ QUYỀN TRUY CẬP / QUYỀN XEM KÊNH:
   - Khi hỏi "kênh này ai có thể xem / chat?" hoặc nhắc đến ID kênh:
     👉 GỌI NGAY CÔNG CỤ 'inspectChannelPermissions({ channelId: '${currentChId}' })' (hoặc ID kênh được nhắc đến).
     👉 TUYỆT ĐỐI KHÔNG ĐƯỢC HỎI LẠI! Công cụ này sẽ tự động báo cáo tất cả từ @everyone, Role thường đến Admin.

2. QUY TẮC BỘ NHỚ HỘI THOẠI (KHÔNG HỎI LẠI VÔ LÝ):
   - Luôn đọc kỹ mục LỊCH SỬ HỘI THOẠI GẦN ĐÂY. Nếu ở các tin nhắn trước người dùng đã nói về kênh nào, hoặc bạn đã hỏi và người dùng vừa xác nhận (ví dụ "đúng rồi", "xem tổng quan"):
     👉 HÃY THỰC HIỆN NGAY DỰA TRÊN NGỮ CẢNH CŨ, TUYỆT ĐỐI KHÔNG HỎI LẶP LẠI!

3. QUY TẮC ĐA TÁC VỤ (KHÔNG BỎ SÓT BƯỚC):
   - Khi người dùng yêu cầu tạo danh mục VÀ tạo kênh bên trong VÀ phân quyền kín:
     👉 BẮT BUỘC TRẢ VỀ ĐỦ TẤT CẢ CÁC BƯỚC:
     • Bước 1: createChannel({ name: 'Tên-Danh-Mục', type: 'category' })
     • Bước 2: createChannel({ name: 'tên-kênh', type: 'text', parentId: '$STEP_1.id' })
     • Bước 3: setChannelPermissionOverwrites({ channelId: '$STEP_1.id', targetId: '${everyoneRoleId}', deny: ['ViewChannel'] })
     ${adminRoleId ? `• Bước 4: setChannelPermissionOverwrites({ channelId: '$STEP_1.id', targetId: '${adminRoleId}', allow: ['ViewChannel', 'SendMessages'] })` : ''}

4. CHỈ GỌI 'request_clarification' KHI THỰC SỰ MẤT PHƯƠNG HƯỚNG VÀ KHÔNG THỂ TRA CỨU ĐƯỢC.`;
}

/**
 * Xử lý tin nhắn Admin Prompt từ kênh quản trị
 * @param {import('discord.js').Message} message 
 */
async function handleAdminPrompt(message) {
  const prompt = message.content.trim();
  if (!prompt) return;

  const thinkingMsg = await message.reply({
    content: '⏳ Đang phân tích yêu cầu...'
  });

  try {
    // 1. Quét ngữ cảnh server hiện tại
    const serverContext = await buildServerContext(message.guild);

    // 2. Thu thập lịch sử trò chuyện gần nhất trong kênh (Chat Memory)
    const recentMessages = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
    const conversationHistory = [];
    if (recentMessages && recentMessages.size > 0) {
      const sorted = Array.from(recentMessages.values())
        .filter(m => m.id !== message.id)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .slice(-6);

      for (const m of sorted) {
        if (m.author.id === message.author.id) {
          const text = m.content ? m.content.trim() : '';
          if (text) conversationHistory.push(`Admin: "${text}"`);
        } else if (m.author.bot) {
          if (m.embeds && m.embeds[0]) {
            const title = m.embeds[0].title || '';
            const desc = m.embeds[0].description || '';
            conversationHistory.push(`Bot: [${title}: ${desc.slice(0, 100)}]`);
          } else if (m.content) {
            conversationHistory.push(`Bot: "${m.content.slice(0, 100)}"`);
          }
        }
      }
    }

    // 3. Chuẩn bị prompt và gọi Gemini
    const systemInstruction = buildSystemInstruction(serverContext, message.channel, conversationHistory);
    const geminiResult = await callGeminiWithCascade({
      contents: prompt,
      systemInstruction,
      tools: ALL_TOOLS
    });

    const response = geminiResult.response;
    const functionCalls = response.functionCalls || [];

    // Xóa tin nhắn "đang phân tích"
    await thinkingMsg.delete().catch(() => {});

    // 4. Phân tích kết quả trả về từ AI
    if (!functionCalls || functionCalls.length === 0) {
      const textReply = response.text || 'Tôi đã ghi nhận nhưng chưa tìm thấy thao tác kỹ thuật phù hợp với yêu cầu này.';
      return await message.reply({ content: textReply });
    }

    // 4. Nếu AI yêu cầu làm rõ (Clarification)
    const clarificationCall = functionCalls.find(fc => fc.name === 'request_clarification');
    if (clarificationCall) {
      const questions = (clarificationCall.args && clarificationCall.args.questions) || ['Sếp có thể mô tả chi tiết hơn không?'];
      return await sendClarificationEmbed(message, prompt, questions);
    }

    // 5. Nếu AI trả về chuỗi các hành động thực thi
    const actions = functionCalls.map((fc, index) => ({
      stepIndex: index + 1,
      toolName: fc.name,
      args: fc.args || {}
    }));

    const riskLevel = calculatePlanRisk(actions);

    const plan = {
      prompt,
      actions,
      riskLevel,
      modelUsed: geminiResult.modelUsed
    };

    // 6. Kiểm tra Fast-track cho lệnh READ_ONLY
    if (riskLevel === RISK_LEVELS.READ_ONLY) {
      return await handleReadOnlyPlan(message, plan);
    }

    // 7. Lệnh có thay đổi server (LOW, MEDIUM, CRITICAL) -> Đi qua Zero-Trust Preview
    await sendPlanPreviewEmbed(message, plan);

  } catch (err) {
    console.error('❌ Lỗi xử lý Admin Prompt:', err);
    await thinkingMsg.edit({
      content: `❌ **Quản gia gặp sự cố khi xử lý yêu cầu:** ${err.message}`
    }).catch(() => {});
  }
}

module.exports = {
  handleAdminPrompt
};
