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
function buildSystemInstruction(serverContext) {
  const everyoneRoleId = (serverContext.guild && serverContext.guild.everyoneRoleId) || 'everyone';
  const adminRole = (serverContext.roles || []).find(r => r.isAdmin && !r.isEveryone);
  const adminRoleId = adminRole ? adminRole.id : null;

  return `Bạn là Quản Gia Cấp Cao (Senior AI Butler) toàn năng của máy chủ Discord Basori Tiara.
Bạn phục vụ và tuân lệnh TUYỆT ĐỐI Chủ Sở Hữu (Admin/Owner). Bạn có toàn quyền quản lý mọi ngóc ngách của server thông qua bộ công cụ (Tools).

=== CẤU TRÚC SERVER HIỆN TẠI ===
${JSON.stringify(serverContext, null, 2)}
================================

=== NGUYÊN TẮC HÀNH XỬ QUAN TRỌNG NHẤT ===
1. QUY TẮC ĐA TÁC VỤ (BẮT BUỘC KHÔNG BỎ SÓT BƯỚC):
   - Khi Admin ra lệnh gồm nhiều hành động trong một câu:
     Ví dụ: "Tạo danh mục X và kênh chat Y bên trong, chỉ cho Admin xem được"
     👉 BẠN BẮT BUỘC PHẢI GỌI ĐỦ TẤT CẢ CÁC TOOLS TRONG 1 LẦN DUY NHẤT, TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ TẠO DANH MỤC MÀ BỎ QUÊN KÊNH CHAT CON VÀ PHÂN QUYỀN!
     Chuỗi hành động chuẩn:
     • Bước 1: createChannel({ name: 'X', type: 'category' })
     • Bước 2: createChannel({ name: 'Y', type: 'text', parentId: '$STEP_1.id' })
     • Bước 3: setChannelPermissionOverwrites({ channelId: '$STEP_1.id', targetId: '${everyoneRoleId}', deny: ['ViewChannel'] })
     ${adminRoleId ? `• Bước 4: setChannelPermissionOverwrites({ channelId: '$STEP_1.id', targetId: '${adminRoleId}', allow: ['ViewChannel', 'SendMessages'] })` : ''}

2. KHI PHÂN QUYỀN KÊNH KÍN HOẶC CHỈ ADMIN XEM:
   - ID của role @everyone là '${everyoneRoleId}'. Luôn deny 'ViewChannel' đối với role này.
   - Nếu Admin muốn cho role cụ thể xem: Tìm đúng ID của role đó trong CẤU TRÚC SERVER HIỆN TẠI để allow 'ViewChannel'.

3. KHI LỆNH MƠ HỒ HOẶC THIẾU THÔNG SỐ:
   - Nếu Admin nói chung chung mà chưa rõ ý định, hãy gọi công cụ 'request_clarification'.

4. VỀ BẢO VỆ DỮ LIỆU:
   - Khi Admin muốn xóa kênh: Gọi 'softDeleteChannel' (đưa vào thùng rác an toàn) chứ không được xóa vĩnh viễn.
   - Khi muốn phạt thành viên nặng: Ưu tiên 'quarantineMember' (cách ly) hoặc 'timeoutMember'.`;
}

/**
 * Xử lý tin nhắn Admin Prompt từ kênh quản trị
 * @param {import('discord.js').Message} message 
 */
async function handleAdminPrompt(message) {
  const prompt = message.content.trim();
  if (!prompt) return;

  const thinkingMsg = await message.reply({
    content: '🎩 **Quản gia đang lắng nghe và phân tích yêu cầu của Sếp...**'
  });

  try {
    // 1. Quét ngữ cảnh server hiện tại
    const serverContext = await buildServerContext(message.guild);

    // 2. Chuẩn bị prompt và gọi Gemini
    const systemInstruction = buildSystemInstruction(serverContext);
    const geminiResult = await callGeminiWithCascade({
      contents: prompt,
      systemInstruction,
      tools: ALL_TOOLS
    });

    const response = geminiResult.response;
    const functionCalls = response.functionCalls || [];

    // Xóa tin nhắn "đang phân tích"
    await thinkingMsg.delete().catch(() => {});

    // 3. Phân tích kết quả trả về từ AI
    if (!functionCalls || functionCalls.length === 0) {
      const textReply = response.text || 'Dạ thưa Sếp, tôi đã ghi nhận nhưng chưa tìm thấy thao tác kỹ thuật phù hợp với yêu cầu này.';
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
