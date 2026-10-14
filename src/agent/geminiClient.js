// src/agent/geminiClient.js
// Quản lý SDK Google Gemini với cơ chế Xoay tua 4 API Key & Thác đổ Model phân cấp

const { GoogleGenAI } = require('@google/genai');
const { GEMINI_API_KEYS } = require('../config/env');

// Chuỗi phân cấp Model từ cao đến thấp (Tối ưu hóa các model chính thức đang mở API)
const MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-3.1-pro-preview'
];

let currentKeyIndex = 0;

/**
 * Lấy API key hiện tại theo cơ chế Round-Robin
 */
function getCurrentApiKey() {
  if (!GEMINI_API_KEYS || GEMINI_API_KEYS.length === 0) {
    throw new Error('❌ Không tìm thấy API Key Gemini nào trong biến môi trường GEMINI_API_KEYS!');
  }
  return GEMINI_API_KEYS[currentKeyIndex % GEMINI_API_KEYS.length];
}

/**
 * Chuyển sang API key kế tiếp khi gặp 429 / Quota limit
 */
function rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  console.log(`🔄 [API KEY ROTATION] Đã chuyển sang Gemini API Key index: ${currentKeyIndex}/${GEMINI_API_KEYS.length}`);
  return getCurrentApiKey();
}

/**
 * Gọi Gemini Model với cơ chế tự động xoay key và fallback model từ cao xuống thấp
 * @param {object} options 
 * @param {string} options.contents 
 * @param {string} options.systemInstruction 
 * @param {Array} options.tools 
 * @returns {Promise<any>}
 */
async function callGeminiWithCascade({ contents, systemInstruction, tools = [] }) {
  let lastError = null;

  // Duyệt qua từng model trong chuỗi phân cấp
  for (let mIdx = 0; mIdx < MODEL_CASCADE.length; mIdx++) {
    const modelName = MODEL_CASCADE[mIdx];
    let keyAttempts = 0;
    const maxKeyAttempts = GEMINI_API_KEYS.length;

    while (keyAttempts < maxKeyAttempts) {
      const apiKey = getCurrentApiKey();
      try {
        const ai = new GoogleGenAI({ apiKey });

        const config = {
          systemInstruction,
          temperature: 0.2 // Nhiệt độ thấp để AI tư duy chính xác theo function schema
        };

        if (tools && tools.length > 0) {
          config.tools = [{ functionDeclarations: tools }];
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config
        });

        return {
          response,
          modelUsed: modelName,
          keyIndexUsed: currentKeyIndex
        };
      } catch (err) {
        lastError = err;
        const errMsg = String(err.message || '');
        const errStatus = err.status || (err.response && err.response.status);

        console.warn(`⚠️ [GEMINI LỖI] Model '${modelName}' với Key index [${currentKeyIndex}]: ${errMsg}`);

        // Nếu lỗi 429 (Hết hạn mức / Rate limit) -> Xoay sang API Key kế tiếp
        if (errStatus === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn('⚡ Gặp mã lỗi 429 (Resource Exhausted) -> Đổi sang API Key tiếp theo ngay!');
          rotateApiKey();
          keyAttempts++;
          continue;
        }

        // Nếu lỗi 503 (Server Overloaded), 500 hoặc 404 (Model chưa mở) -> Chuyển sang Model kế tiếp
        if (errStatus === 503 || errStatus === 404 || errMsg.includes('503') || errMsg.includes('not found')) {
          console.warn(`🔄 Model '${modelName}' bị quá tải hoặc chưa hỗ trợ -> Tự động chuyển xuống model tiếp theo...`);
          break; // Thoát khỏi vòng lặp key để chuyển sang model cấp dưới
        }

        // Lỗi khác: Thử key tiếp theo
        rotateApiKey();
        keyAttempts++;
      }
    }
  }

  throw new Error(`❌ Toàn bộ 4 API Key và các tầng Model Gemini đều thất bại! Lỗi cuối: ${lastError ? lastError.message : 'Unknown'}`);
}

module.exports = {
  MODEL_CASCADE,
  getCurrentApiKey,
  rotateApiKey,
  callGeminiWithCascade
};
