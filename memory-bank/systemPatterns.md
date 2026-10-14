# System Patterns & Architecture (basori-tiara-bot)

## Tech Stack & Runtime
- **Runtime**: Node.js (v18+ / v20 / v24).
- **Core Framework**: `discord.js` v14.16.3 (REST API v10, Gateway Intent: Guilds, GuildMessages, MessageContent, GuildMembers).
- **Database Layer**: Dual Storage Architecture:
  - **Primary**: MongoDB Atlas via `mongoose` (v9.11.2).
  - **Fallback**: Atomic Local JSON Storage (`data/storage.json`) khi không có `MONGO_URI` hoặc rớt kết nối mạng.
- **Environment**: `dotenv` v16.4.5.
- **Hosting / Container**: Wispbyte (Pterodactyl Panel, Container Node.js, 512 MB RAM, 1 GB Storage).

---

## Codebase Map (Key Files & Responsibilities)

### 1. Root & Entry Point
- [`index.js`](file:///d:/discord-bot/basori-tiara-bot/index.js): Điểm vào chính của bot, khởi tạo `Client`, nạp các Intent cần thiết, khởi chạy kết nối cơ sở dữ liệu (MongoDB / JSON fallback), gọi nạp toàn bộ lệnh (`commands`) và sự kiện (`events`).
- [`package.json`](file:///d:/discord-bot/basori-tiara-bot/package.json): Khai báo dependencies, scripts chạy `node index.js`, số phiên bản chính thức.
- [`.env`](file:///d:/discord-bot/basori-tiara-bot/.env): Cấu hình bảo mật gồm `DISCORD_TOKEN`, `CLIENT_ID`, `MONGO_URI`, `LOG_CHANNEL_ID`.

### 2. Configuration (`src/config/`)
- [`src/config/env.js`](file:///d:/discord-bot/basori-tiara-bot/src/config/env.js): Kiểm tra và trích xuất biến môi trường an toàn.
- [`src/config/ids.js`](file:///d:/discord-bot/basori-tiara-bot/src/config/ids.js): Lưu các ID cố định, kênh log tập trung `1559750487299850331`.
- [`src/config/version.js`](file:///d:/discord-bot/basori-tiara-bot/src/config/version.js): Quản lý phiên bản (`v1.0.1`), mã định danh `buildId` và thời gian đóng gói để nhận diện bản deploy.
- [`src/config/emojis.js`](file:///d:/discord-bot/basori-tiara-bot/src/config/emojis.js): Ánh xạ emoji hệ thống / custom.
- [`src/config/kaomojis.js`](file:///d:/discord-bot/basori-tiara-bot/src/config/kaomojis.js): Danh sách Kaomoji xoay tua trạng thái Custom Presence mỗi 60 giây.

### 3. Database Layer (`src/database/`)
- [`src/database/mongoose.js`](file:///d:/discord-bot/basori-tiara-bot/src/database/mongoose.js): Quản lý kết nối MongoDB với cơ chế retry và log lỗi.
- [`src/database/storageAdapter.js`](file:///d:/discord-bot/basori-tiara-bot/src/database/storageAdapter.js): Lớp điều phối dữ liệu kép, tự động lưu và đọc trong suốt giữa MongoDB và `data/storage.json`.
- [`src/database/models/Settings.js`](file:///d:/discord-bot/basori-tiara-bot/src/database/models/Settings.js): Schema cấu hình guild (kênh welcome, kênh log...).
- [`src/database/models/Warning.js`](file:///d:/discord-bot/basori-tiara-bot/src/database/models/Warning.js): Schema lưu trữ lịch sử cảnh cáo (warns) của thành viên.

### 4. Commands (`src/commands/`) - 22 Slash Commands
- [`src/commands/index.js`](file:///d:/discord-bot/basori-tiara-bot/src/commands/index.js): Bộ nạp tự động (Auto-loader) đệ quy toàn bộ thư mục con vào `client.commands`.
- **`moderation/` (8 lệnh)**: `ban.js`, `unban.js`, `kick.js`, `timeout.js`, `untimeout.js`, `warn.js`, `warnings.js`, `clearwarns.js`.
- **`chat/` (5 lệnh)**: `clear.js` (xóa tin nhắn hàng loạt), `channel.js`, `lock.js` (khóa kênh), `unlock.js` (mở khóa kênh), `slowmode.js`.
- **`community/` (3 lệnh)**: `poll.js` (bình chọn biểu quyết), `announce.js` (thông báo embed trang trọng), `setwelcome.js` (cài kênh chào mừng).
- **`utility/` (6 lệnh)**: `ping.js` (độ trễ + version badge), `help.js` (menu hướng dẫn), `serverinfo.js`, `userinfo.js`, `role.js`, `nickname.js`.

### 5. Events & Gateway Handlers (`src/events/`)
- [`src/events/ready.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/ready.js): Khởi tạo bot, log thông tin phiên bản to rõ ra Console, nạp Kaomoji presence, đồng bộ Slash Commands toàn cầu, dọn dẹp guild commands thừa, gửi log trực tuyến về kênh log.
- [`src/events/interactionCreate.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/interactionCreate.js): Điều phối thực thi Slash Command, xử lý Cooldown và bắt lỗi tập trung.
- [`src/events/messageCreate.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/messageCreate.js): Giám sát tin nhắn, kích hoạt Anti-Spam đa tiêu chí (flood, lặp, mention, emoji) và tự động timeout 10 phút.
- [`src/events/messageDelete.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/messageDelete.js): Ghi log audit khi có tin nhắn bị xóa (kèm nội dung, người gửi, kênh, file đính kèm).
- [`src/events/messageUpdate.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/messageUpdate.js): Ghi log audit khi có tin nhắn bị chỉnh sửa (nội dung trước và sau).
- [`src/events/guildMemberAdd.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/guildMemberAdd.js): Gửi thông báo chào mừng + kích hoạt thuật toán Anti-Raid.
- [`src/events/guildMemberRemove.js`](file:///d:/discord-bot/basori-tiara-bot/src/events/guildMemberRemove.js): Gửi log khi có thành viên rời server hoặc bị kick/ban.

### 6. Utilities & Security (`src/utils/`)
- [`src/utils/logger.js`](file:///d:/discord-bot/basori-tiara-bot/src/utils/logger.js): Bộ ghi log tập trung 3 lớp: Console -> File `bot-error.log` -> Kênh Discord `1559750487299850331`.
- [`src/utils/antiSpam.js`](file:///d:/discord-bot/basori-tiara-bot/src/utils/antiSpam.js): Bộ đệm trượt phát hiện Flood (>5 msg/5s), Tin nhắn lặp (>3 lần), Tag quá đà (>5 mentions), Spam biểu cảm (>8 emojis).
- [`src/utils/antiRaid.js`](file:///d:/discord-bot/basori-tiara-bot/src/utils/antiRaid.js): Giám sát tốc độ join server (>5 người/10 giây) và phát chuông cảnh báo khẩn cấp trong kênh log.
- [`src/utils/rateLimiter.js`](file:///d:/discord-bot/basori-tiara-bot/src/utils/rateLimiter.js): Quản lý cooldown lệnh chống spam API.

---

## Key Architecture Decisions
1. **Dual Storage Layer**: Cho phép bot chạy độc lập mà không cần MongoDB URL. Khi có MongoDB thì tự đồng bộ, khi không có thì fallback sang JSON nguyên tử, bảo đảm bot không crash trên hosting miễn phí.
2. **Centralized Log Hub**: Mọi hoạt động quản trị, bảo mật (warn, mute, kick, ban, anti-spam, xóa/sửa tin nhắn) đều được bắn tự động về kênh `1559750487299850331`.
3. **Traceable Versioning**: Mỗi bản cập nhật được gán `version` và `buildId` xuất hiện ở 3 nơi (Console Wispbyte, Embed khởi động trong Discord, và Footer của lệnh `/ping`) để kiểm tra tức thì phiên bản đã deploy.
4. **Flat Root Packaging**: Nén trực tiếp các file từ root dự án để khi giải nén trên Pterodactyl container, các file nằm ngay tại `/home/container/`, tương thích 100% với file chạy mặc định `index.js`.
