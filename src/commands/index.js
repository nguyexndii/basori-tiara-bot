// src/commands/index.js
// Bộ nạp tự động toàn bộ Slash Commands từ các thư mục phân loại

const fs = require('fs');
const path = require('path');

function loadAllCommands() {
  const commands = [];
  const categories = ['moderation', 'chat', 'utility', 'community'];

  for (const cat of categories) {
    const dir = path.join(__dirname, cat);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const cmd = require(path.join(dir, file));
        if (cmd?.data && typeof cmd.execute === 'function') {
          cmd.category = cat;
          commands.push(cmd);
        }
      } catch (err) {
        console.error('Lỗi nạp lệnh %s/%s:', cat, file, err.message);
      }
    }
  }

  return commands;
}

module.exports = { loadAllCommands };
