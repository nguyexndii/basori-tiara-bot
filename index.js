// index.js
// Entrypoint chính thức của Basori Tiara Discord Bot (Kiến trúc phân tầng chuẩn)

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { TOKEN } = require('./src/config/env');
const { connectDatabase } = require('./src/database/mongoose');
const { loadAllCommands } = require('./src/commands');
const { logSystemError } = require('./src/utils/logger');

// 1. Khởi tạo Client Discord với đầy đủ các Intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. Nạp toàn bộ Slash Commands vào Collection
client.commands = new Collection();
const allCommands = loadAllCommands();
for (const cmd of allCommands) {
  client.commands.set(cmd.data.name, cmd);
}
console.log(`📦 Đã nạp thành công ${client.commands.size} lệnh Slash từ các module.`);

// 3. Nạp và đăng ký toàn bộ Event Handlers từ thư mục src/events
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
  console.log(`⚡ Đã đăng ký thành công ${eventFiles.length} sự kiện Discord.`);
}

// 4. Cơ chế Chống Sập 24/7 (Anti-Crash Protection)
process.on('unhandledRejection', async (reason) => {
  console.error('⚠️ [ANTI-CRASH] Unhandled Rejection:', reason);
  await logSystemError(client, 'Unhandled Rejection (Chống sập)', reason).catch(() => {});
});

process.on('uncaughtException', async (error) => {
  console.error('⚠️ [ANTI-CRASH] Uncaught Exception:', error);
  await logSystemError(client, 'Uncaught Exception (Chống sập)', error).catch(() => {});
});

// 5. Khởi động kết nối Database và đăng nhập Bot
(async () => {
  try {
    await connectDatabase();
    await client.login(TOKEN);
  } catch (error) {
    console.error('❌ Lỗi nghiêm trọng khi khởi động bot:', error);
    process.exit(1);
  }
})();
