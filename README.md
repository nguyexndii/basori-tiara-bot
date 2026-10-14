# Basori Tiara - Discord Moderation & Community Bot

Bot quản trị máy chủ Discord lấy cảm hứng từ nhân vật **Basori Tiara (馬剃 天愛星)** – Phó Hội Trưởng Hội Học Sinh trường Tsuwabuki (*Makeine: Too Many Losing Heroines!*).

---

## Tính năng nổi bật

- **22 lệnh Slash:** Phân quyền kép (Discord Native Permissions + Runtime Authorization Check).
- **Trừng phạt & Kỷ luật:** `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clearwarns`.
- **Quản trị kênh & Chat:** `/clear` (dọn dẹp tin nhắn kèm cơ chế fallback), `/slowmode`, `/lock`, `/unlock`, `/channel`.
- **Tiện ích thành viên:** `/role`, `/nickname`, `/serverinfo`, `/userinfo`.
- **Cộng đồng & Tương tác:** `/poll` (bình chọn Discord Native Poll Widget), `/announce` (thông báo Embed), `/setwelcome` (tự động chào đón thành viên mới).
- **Chẩn đoán:** `/ping` (đo độ trễ phản hồi & WebSocket API).
- **Hệ thống Anti-Raid:** Tự động phát hiện và cảnh báo hành vi join tràn tài khoản ảo đột biến.
- **Hệ thống Anti-Spam & Anti-MassMention:** Tự động xóa tin nhắn spam, lặp chữ, spam emoji hoặc tag quá nhiều người; tự động cách ly thành viên tái phạm.
- **Nhật ký tập trung (Centralized Logging):** Ghi lại toàn bộ hành động quản trị, cảnh báo an ninh và lỗi hệ thống về kênh log chỉ định.
- **Cơ sở dữ liệu kép:** Hỗ trợ kết nối MongoDB Atlas (Mongoose) kèm cơ chế JSON Storage fallback an toàn.
- **Chống sập 24/7 (Anti-Crash):** Bắt toàn bộ lỗi `unhandledRejection` và `uncaughtException`.
- **Pixel Art Emojis & Kaomoji:** Tự động đồng bộ Discord Application Emojis và xoay tua hơn 50 biểu cảm Kaomoji mỗi 60 giây.

---

## Yêu cầu hệ thống

- Node.js v18.0.0 trở lên.
- Ứng dụng Bot tạo từ Discord Developer Portal với các Privileged Gateway Intents:
  - Server Members Intent
  - Message Content Intent

---

## Cài đặt & Khởi chạy

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
LOG_CHANNEL_ID=1559750487299850331
# MONGODB_URI=mongodb+srv://... (tùy chọn)
```

### 3. Khởi chạy
```bash
npm start
```

---

## Cấu trúc thư mục

```
basori-tiara-bot/
├── src/
│   ├── config/               # Cấu hình tập trung (env, ids, emojis, kaomojis)
│   ├── database/             # Kết nối MongoDB Mongoose & JSON storage adapter
│   │   └── models/           # Mongoose schemas (Warning, Settings)
│   ├── commands/             # 22 câu lệnh Slash phân nhóm chuyên biệt
│   │   ├── moderation/       # ban, kick, timeout, untimeout, unban, warn, warnings, clearwarns
│   │   ├── chat/             # clear, slowmode, lock, unlock, channel
│   │   ├── utility/          # role, nickname, serverinfo, userinfo, ping, help
│   │   └── community/        # announce, poll, setwelcome
│   ├── events/               # Bộ lắng nghe sự kiện Discord (ready, interactionCreate, messageCreate, guildMemberAdd)
│   └── utils/                # Logger kênh log, rateLimiter cooldown, antiSpam, antiRaid
├── data/                     # Dữ liệu runtime (storage.json)
├── .env.example
├── .gitignore
├── index.js                  # Entrypoint chính thức tích hợp Anti-Crash
├── package.json
└── README.md
```

---

## Giấy phép

Dự án được phát hành dưới giấy phép MIT.
